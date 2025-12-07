import { useEffect, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { Language } from './LanguageSelector';
import type { CursorPosition } from '@/hooks/useSocket';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: Language;
  onCursorChange?: (cursor: CursorPosition) => void;
  remoteCursors?: Record<string, CursorPosition>;
}

// Map our language values to Monaco language identifiers
const MONACO_LANGUAGE_MAP: Record<Language, string> = {
  javascript: 'javascript',
  python: 'python',
  sql: 'sql',
};

// Default code samples for each language
export const DEFAULT_CODE: Record<Language, string> = {
  javascript: `// Welcome to CodePair!
// Write your JavaScript code here

function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));
console.log('2 + 2 =', 2 + 2);
`,
  python: `# Welcome to CodePair!
# Write your Python code here

def greet(name):
    return f"Hello, {name}!"

print(greet("World"))
print("2 + 2 =", 2 + 2)
`,
  sql: `-- Welcome to CodePair!
-- Write your SQL code here

SELECT 
    id,
    name,
    email
FROM users
WHERE active = true
ORDER BY created_at DESC
LIMIT 10;
`,
};

/**
 * Monaco code editor component.
 * 
 * Features:
 * - Syntax highlighting for JavaScript, Python, and SQL
 * - Modern dark/light theme based on system preference
 * - Minimap, line numbers, and other IDE features
 * - Controlled component with value and onChange props
 * - Real-time cursor synchronization
 * 
 * The editor automatically adjusts its language mode when
 * the language prop changes.
 */
export function CodeEditor({
  value,
  onChange,
  language,
  onCursorChange,
  remoteCursors
}: CodeEditorProps) {
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<any>(null);

  const handleChange = (newValue: string | undefined) => {
    onChange(newValue ?? '');
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    decorationsRef.current = editor.createDecorationsCollection([]);

    editor.onDidChangeCursorPosition((e) => {
      if (onCursorChange) {
        const selection = editor.getSelection();
        onCursorChange({
          line: e.position.lineNumber,
          column: e.position.column,
          selectionStart: selection ? {
            line: selection.startLineNumber,
            column: selection.startColumn,
          } : undefined,
          selectionEnd: selection ? {
            line: selection.endLineNumber,
            column: selection.endColumn,
          } : undefined,
        });
      }
    });
  };

  // Manage remote cursor widgets
  const cursorWidgetsRef = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    if (!editorRef.current || !decorationsRef.current || !remoteCursors) return;
    const editor = editorRef.current;
    const widgets = cursorWidgetsRef.current;

    const CURSOR_COLORS = [
      '#FF3B30', // Red
      '#4CD964', // Green
      '#3B82F6', // Brighter Blue
      '#FFCC00', // Yellow
      '#8B5CF6', // Brighter Purple
      '#FF9500', // Orange
      '#FF2D55', // Pink
      '#5AC8FA', // Teal
    ];

    // 1. Handle Selections (Decorations)
    const selectionDecorations = Object.entries(remoteCursors)
      .filter(([_, cursor]) => cursor.selectionStart && cursor.selectionEnd)
      .map(([id, cursor]) => {
        const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const color = CURSOR_COLORS[hash % CURSOR_COLORS.length];

        // Convert hex to rgba for selection background (20% opacity)
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        const rgba = `rgba(${r}, ${g}, ${b}, 0.2)`;

        return {
          range: {
            startLineNumber: cursor.selectionStart!.line,
            startColumn: cursor.selectionStart!.column,
            endLineNumber: cursor.selectionEnd!.line,
            endColumn: cursor.selectionEnd!.column,
          },
          options: {
            className: `remote-selection-${id}`,
            stickiness: 1,
          },
        };
      });

    // Inject CSS for selections
    const styleId = 'remote-selection-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    const cssRules = Object.entries(remoteCursors).map(([id, _]) => {
      const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const color = CURSOR_COLORS[hash % CURSOR_COLORS.length];
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);

      return `
        .remote-selection-${id} {
          background-color: rgba(${r}, ${g}, ${b}, 0.2);
        }
      `;
    }).join('\n');

    styleElement.textContent = cssRules;
    decorationsRef.current.set(selectionDecorations);

    // 2. Handle Cursors (ContentWidgets)
    // Update or create widgets for active cursors
    Object.entries(remoteCursors).forEach(([id, cursor]) => {
      let widget = widgets.get(id);

      if (!widget) {
        // Create new widget
        const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const color = CURSOR_COLORS[hash % CURSOR_COLORS.length];

        const contentNode = document.createElement('div');
        contentNode.className = `remote-cursor-widget-${id}`;
        contentNode.style.borderLeft = `2px solid ${color}`;
        contentNode.style.height = '20px'; // Approximate line height
        contentNode.style.position = 'relative';
        contentNode.style.pointerEvents = 'none'; // Don't block clicks

        const labelNode = document.createElement('div');
        labelNode.textContent = 'Guest';
        labelNode.style.position = 'absolute';
        labelNode.style.top = '-1.4em';
        labelNode.style.left = '-2px';
        labelNode.style.backgroundColor = color;
        labelNode.style.color = 'white';
        labelNode.style.fontSize = '10px';
        labelNode.style.fontWeight = 'bold';
        labelNode.style.padding = '1px 4px';
        labelNode.style.borderRadius = '4px';
        labelNode.style.whiteSpace = 'nowrap';
        labelNode.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';

        contentNode.appendChild(labelNode);

        widget = {
          getId: () => `cursor.widget.${id}`,
          getDomNode: () => contentNode,
          getPosition: () => ({
            position: { lineNumber: cursor.line, column: cursor.column },
            preference: [0], // ContentWidgetPositionPreference.EXACT
          }),
        };

        editor.addContentWidget(widget);
        widgets.set(id, widget);
      } else {
        // Update existing widget position
        // We overwrite the getPosition method to return the new position
        widget.getPosition = () => ({
          position: { lineNumber: cursor.line, column: cursor.column },
          preference: [0],
        });
        editor.layoutContentWidget(widget);
      }
    });

    // 2. Remove widgets for disconnected users
    const activeIds = new Set(Object.keys(remoteCursors));
    widgets.forEach((widget, id) => {
      if (!activeIds.has(id)) {
        editor.removeContentWidget(widget);
        widgets.delete(id);
      }
    });

  }, [remoteCursors]);

  return (
    <div className="h-full w-full overflow-hidden rounded-lg border border-editor-border bg-editor">
      <Editor
        height="100%"
        language={MONACO_LANGUAGE_MAP[language]}
        value={value}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontLigatures: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          padding: { top: 16, bottom: 16 },
          lineNumbers: 'on',
          renderLineHighlight: 'line',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          tabSize: 2,
          automaticLayout: true,
          wordWrap: 'on',
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
        }}
      />
    </div>
  );
}
