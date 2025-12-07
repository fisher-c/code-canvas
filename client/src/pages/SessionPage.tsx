import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Loader2 } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { LanguageSelector, type Language } from '@/components/LanguageSelector';
import { CodeEditor, DEFAULT_CODE } from '@/components/CodeEditor';
import { OutputPanel } from '@/components/OutputPanel';
import { HuddlePanel } from '@/components/HuddlePanel';
import { useSocket, type CursorPosition } from '@/hooks/useSocket';
import { usePyodide } from '@/hooks/usePyodide';
import { executeJavaScript } from '@/lib/codeExecution';
import {
  ApiError,
  createSession as apiCreateSession,
  getCodeSnapshot,
  getSession,
  joinSession,
  leaveSession,
  saveCode,
} from '@/lib/api';

/**
 * Session page component - main coding interface.
 *
 * Connects to the backend to create/fetch sessions, hydrate saved code,
 * autosave changes, and register participants. Real-time edits are
 * shared over Socket.IO.
 */
export function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();

  const [codeByLanguage, setCodeByLanguage] = useState<Record<Language, string>>({
    javascript: DEFAULT_CODE.javascript,
    python: DEFAULT_CODE.python,
    sql: DEFAULT_CODE.sql,
  });

  const [language, setLanguage] = useState<Language>('javascript');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [presenceCount, setPresenceCount] = useState(1);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isHuddleOpen, setIsHuddleOpen] = useState(false);

  // Use a ref to ensure we always have the latest participantId in callbacks
  const participantIdRef = useRef<string | null>(null);

  const saveTimers = useRef<Record<Language, number | null>>({
    javascript: null,
    python: null,
    sql: null,
  });
  const mountedRef = useRef(true);
  const storageKey = sessionId ? `codepair-participant-${sessionId}` : null;

  const currentCode = codeByLanguage[language];

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleCodeUpdateFromSocket = useCallback(
    (newCode: string, incomingLanguage?: Language) => {
      const targetLanguage = incomingLanguage ?? language;
      setCodeByLanguage((prev) => ({ ...prev, [targetLanguage]: newCode }));
      if (incomingLanguage && sessionId) {
        void saveCode(sessionId, { language: incomingLanguage, content: newCode }).catch(() => {
          /* best-effort persist */
        });
      }
    },
    [language, sessionId]
  );

  const handleCodeOutputFromSocket = useCallback((newOutput: string, newError: string | null) => {
    setOutput(newOutput);
    setError(newError);
  }, []);

  const { isConnected, emitCodeUpdate, emitCodeOutput, emitCursorUpdate, remoteCursors } = useSocket({
    sessionId: sessionId || '',
    onCodeUpdate: handleCodeUpdateFromSocket,
    onCodeOutput: handleCodeOutputFromSocket,
  });

  const { runPython, isLoading: isPyodideLoading } = usePyodide();

  useEffect(() => {
    if (!sessionId) return;

    // Restore last selected language for this session (if any)
    const savedLang = sessionStorage.getItem(`codepair-lang-${sessionId}`) as Language | null;
    if (savedLang) {
      setLanguage(savedLang);
    }

    let canceled = false;
    const bootstrap = async () => {
      setIsInitializing(true);
      setSessionError(null);

      try {
        let session;
        try {
          session = await apiCreateSession(sessionId);
        } catch (err) {
          if (err instanceof ApiError && err.status === 409) {
            session = await getSession(sessionId);
          } else {
            throw err;
          }
        }

        if (canceled) return;

        const snapshot = await getCodeSnapshot(session.sessionId);
        if (canceled) return;

        const hydrated: Record<Language, string> = { ...DEFAULT_CODE };
        Object.entries(snapshot.codeByLanguage).forEach(([lang, doc]) => {
          hydrated[lang as Language] = doc.content;
        });
        setCodeByLanguage(hydrated);

        // If we have a stored participant, clean it up first to avoid double-counting
        const existingParticipantId = storageKey ? sessionStorage.getItem(storageKey) : null;
        if (existingParticipantId) {
          await leaveSession(session.sessionId, existingParticipantId, { keepalive: true }).catch(() => {
            /* best-effort cleanup */
          });
        }

        const presence = await joinSession(session.sessionId, { displayName: 'Guest' });
        if (canceled) return;

        setPresenceCount(presence.activeParticipants || 1);
        const pid = presence.participantId ?? null;
        setParticipantId(pid);
        participantIdRef.current = pid;
        if (storageKey && presence.participantId) {
          sessionStorage.setItem(storageKey, presence.participantId);
        }
      } catch {
        if (canceled) return;
        setSessionError('Unable to reach the backend. You can continue offline.');
      } finally {
        if (!canceled) setIsInitializing(false);
      }
    };

    bootstrap();

    return () => {
      canceled = true;
    };
  }, [sessionId, storageKey]);

  useEffect(() => {
    if (!sessionId || !participantId) return;
    return () => {
      void leaveSession(sessionId, participantId, { keepalive: true }).catch(() => {
        /* non-blocking cleanup */
      });
    };
  }, [participantId, sessionId]);

  const scheduleSave = useCallback(
    (lang: Language, content: string) => {
      if (!sessionId) return;
      const existing = saveTimers.current[lang];
      if (existing) {
        window.clearTimeout(existing);
      }
      saveTimers.current[lang] = window.setTimeout(async () => {
        try {
          await saveCode(sessionId, { language: lang, content });
          if (mountedRef.current) setSessionError(null);
        } catch {
          if (mountedRef.current) {
            setSessionError('Autosave failed. Changes are only local right now.');
          }
        }
      }, 500);
    },
    [sessionId]
  );

  const isBusy = useMemo(
    () => isRunning || (language === 'python' && isPyodideLoading),
    [isRunning, isPyodideLoading, language]
  );

  const handleCodeChange = (newCode: string) => {
    setCodeByLanguage((prev) => ({ ...prev, [language]: newCode }));
    emitCodeUpdate(newCode, language);
    scheduleSave(language, newCode);
  };

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
    if (sessionId) {
      sessionStorage.setItem(`codepair-lang-${sessionId}`, newLanguage);
    }
    setOutput('');
    setError(null);
  };

  const handleRun = async () => {
    setIsRunning(true);
    setOutput('');
    setError(null);

    let runOutput = '';
    let runError: string | null = null;

    try {
      if (language === 'javascript') {
        const result = executeJavaScript(currentCode);
        runOutput = result.output;
        runError = result.error;
      } else if (language === 'python') {
        const result = await runPython(currentCode);
        runOutput = result.output;
        runError = result.error;
      } else if (language === 'sql') {
        runError = 'SQL execution is not supported yet. Syntax highlighting only.';
      }
    } catch (err) {
      runError = err instanceof Error ? err.message : 'An error occurred';
    } finally {
      setOutput(runOutput);
      setError(runError);
      setIsRunning(false);
      emitCodeOutput(runOutput, runError);
    }
  };

  const handleCursorChange = useCallback((cursor: CursorPosition) => {
    const pid = participantIdRef.current;
    if (pid) {
      emitCursorUpdate({ ...cursor, participantId: pid });
    }
  }, [emitCursorUpdate]);

  const handleHuddleToggle = () => {
    setIsHuddleOpen((prev) => !prev);
  };

  if (!sessionId) {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground">No session ID provided.</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <TopBar
        sessionId={sessionId}
        isConnected={isConnected}
        connectedUsers={presenceCount}
        isHuddleOpen={isHuddleOpen}
        onHuddleToggle={handleHuddleToggle}
      />

      <div className="flex-1 flex flex-col lg:flex-row p-4 gap-4 overflow-hidden">
        <div className="flex-1 flex flex-col gap-4 min-h-0 min-w-0">
          {sessionError && (
            <div className="px-3 py-2 rounded-md bg-amber-100 text-amber-900 text-sm border border-amber-200">
              {sessionError}
            </div>
          )}

          <div className="flex items-center justify-between">
            <LanguageSelector value={language} onChange={handleLanguageChange} />

            <button
              onClick={handleRun}
              disabled={isBusy || isInitializing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground font-medium rounded-md shadow-sm hover:shadow transition-all duration-200"
            >
              {isBusy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isPyodideLoading ? 'Loading Python...' : 'Running...'}
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run
                </>
              )}
            </button>
          </div>

          <div className="flex-1 grid grid-rows-[1fr_200px] gap-4 min-h-0">
            <CodeEditor
              value={currentCode}
              onChange={handleCodeChange}
              language={language}
              onCursorChange={handleCursorChange}
              remoteCursors={remoteCursors}
            />

            <OutputPanel output={output} error={error} isRunning={isBusy} />
          </div>
        </div>

        {isHuddleOpen && (
          <div className="w-full lg:w-80 xl:w-96 h-64 lg:h-full shrink-0">
            <HuddlePanel sessionId={sessionId} onClose={() => setIsHuddleOpen(false)} />
          </div>
        )}
      </div>
    </div>
  );
}
