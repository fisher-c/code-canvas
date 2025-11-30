import Editor from '@monaco-editor/react';
import type { Language } from './LanguageSelector';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: Language;
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
 * 
 * The editor automatically adjusts its language mode when
 * the language prop changes.
 */
export function CodeEditor({ value, onChange, language }: CodeEditorProps) {
  const handleChange = (newValue: string | undefined) => {
    onChange(newValue ?? '');
  };

  return (
    <div className="h-full w-full overflow-hidden rounded-lg border border-editor-border bg-editor">
      <Editor
        height="100%"
        language={MONACO_LANGUAGE_MAP[language]}
        value={value}
        onChange={handleChange}
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
