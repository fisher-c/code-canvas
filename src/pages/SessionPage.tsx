import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Loader2 } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { LanguageSelector, type Language } from '@/components/LanguageSelector';
import { CodeEditor, DEFAULT_CODE } from '@/components/CodeEditor';
import { OutputPanel } from '@/components/OutputPanel';
import { HuddlePanel } from '@/components/HuddlePanel';
import { useSocket } from '@/hooks/useSocket';
import { usePyodide } from '@/hooks/usePyodide';
import { executeJavaScript } from '@/lib/codeExecution';

/**
 * Session page component - main coding interface.
 * 
 * Features:
 * - Monaco code editor with syntax highlighting
 * - Language selector (JavaScript, Python, SQL)
 * - Code execution for JS and Python
 * - Output panel for results
 * - Socket.IO connection for real-time collaboration (prepared for backend)
 * 
 * The session ID comes from the URL parameter and is used to:
 * - Display in the top bar
 * - Create a Socket.IO room for collaboration
 */
export function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  
  // Code state - separate code for each language to preserve work
  const [codeByLanguage, setCodeByLanguage] = useState<Record<Language, string>>({
    javascript: DEFAULT_CODE.javascript,
    python: DEFAULT_CODE.python,
    sql: DEFAULT_CODE.sql,
  });
  
  const [language, setLanguage] = useState<Language>('javascript');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isHuddleOpen, setIsHuddleOpen] = useState(false);

  // Current code based on selected language
  const currentCode = codeByLanguage[language];

  // Socket.IO connection for real-time collaboration
  const handleCodeUpdateFromSocket = useCallback((newCode: string) => {
    setCodeByLanguage(prev => ({ ...prev, [language]: newCode }));
  }, [language]);

  const { isConnected, connectedUsers, emitCodeUpdate } = useSocket({
    sessionId: sessionId || '',
    onCodeUpdate: handleCodeUpdateFromSocket,
  });

  // Pyodide for Python execution
  const { runPython, isLoading: isPyodideLoading } = usePyodide();

  // Handle code changes
  const handleCodeChange = (newCode: string) => {
    setCodeByLanguage(prev => ({ ...prev, [language]: newCode }));
    // Emit to other users via Socket.IO
    emitCodeUpdate(newCode);
  };

  // Handle language change
  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
    // Clear output when switching languages
    setOutput('');
    setError(null);
  };

  // Execute code
  const handleRun = async () => {
    setIsRunning(true);
    setOutput('');
    setError(null);

    try {
      if (language === 'javascript') {
        // Execute JavaScript in browser
        const result = executeJavaScript(currentCode);
        setOutput(result.output);
        setError(result.error);
      } else if (language === 'python') {
        // Execute Python using Pyodide
        const result = await runPython(currentCode);
        setOutput(result.output);
        setError(result.error);
      } else if (language === 'sql') {
        // SQL execution not supported yet
        setOutput('');
        setError('SQL execution is not supported yet. Syntax highlighting only.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsRunning(false);
    }
  };

  const handleHuddleToggle = () => {
    setIsHuddleOpen(prev => !prev);
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <TopBar 
        sessionId={sessionId} 
        isConnected={isConnected}
        connectedUsers={connectedUsers}
        isHuddleOpen={isHuddleOpen}
        onHuddleToggle={handleHuddleToggle}
      />
      
      <div className="flex-1 flex flex-col lg:flex-row p-4 gap-4 overflow-hidden">
        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col gap-4 min-h-0 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <LanguageSelector value={language} onChange={handleLanguageChange} />
            
            <button
              onClick={handleRun}
              disabled={isRunning || (language === 'python' && isPyodideLoading)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground font-medium rounded-md shadow-sm hover:shadow transition-all duration-200"
            >
              {isRunning || (language === 'python' && isPyodideLoading) ? (
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

          {/* Editor + Output Grid */}
          <div className="flex-1 grid grid-rows-[1fr_200px] gap-4 min-h-0">
            {/* Code Editor */}
            <CodeEditor
              value={currentCode}
              onChange={handleCodeChange}
              language={language}
            />

            {/* Output Panel */}
            <OutputPanel
              output={output}
              error={error}
              isRunning={isRunning || (language === 'python' && isPyodideLoading)}
            />
          </div>
        </div>

        {/* Huddle Panel - shown on the right (desktop) or bottom (mobile) */}
        {isHuddleOpen && sessionId && (
          <div className="w-full lg:w-80 xl:w-96 h-64 lg:h-full shrink-0">
            <HuddlePanel 
              sessionId={sessionId} 
              onClose={() => setIsHuddleOpen(false)} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
