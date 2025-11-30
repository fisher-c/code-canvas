import { Terminal, AlertCircle, CheckCircle } from 'lucide-react';

interface OutputPanelProps {
  output: string;
  error: string | null;
  isRunning: boolean;
}

/**
 * Output panel component for displaying code execution results.
 * 
 * Features:
 * - Displays stdout from code execution
 * - Shows errors with visual distinction
 * - Loading state while code is running
 * - Terminal-like appearance with monospace font
 */
export function OutputPanel({ output, error, isRunning }: OutputPanelProps) {
  return (
    <div className="h-full flex flex-col bg-output rounded-lg border border-editor-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/20 bg-output">
        <Terminal className="w-4 h-4 text-output-foreground/60" />
        <span className="text-sm font-medium text-output-foreground/80">Output</span>
        {isRunning && (
          <span className="ml-auto text-xs text-primary animate-pulse-subtle">Running...</span>
        )}
      </div>

      {/* Output Content */}
      <div className="flex-1 p-4 overflow-auto">
        {isRunning ? (
          <div className="flex items-center gap-2 text-output-foreground/60">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Executing code...</span>
          </div>
        ) : error ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Error</span>
            </div>
            <pre className="text-sm font-mono text-destructive whitespace-pre-wrap">
              {error}
            </pre>
          </div>
        ) : output ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Success</span>
            </div>
            <pre className="text-sm font-mono text-output-foreground whitespace-pre-wrap">
              {output}
            </pre>
          </div>
        ) : (
          <div className="text-sm text-output-foreground/40 italic">
            Click "Run" to execute your code
          </div>
        )}
      </div>
    </div>
  );
}
