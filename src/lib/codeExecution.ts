/**
 * JavaScript code execution utility.
 * 
 * Executes JavaScript code in the browser using the Function constructor.
 * Captures console.log outputs and handles errors.
 * 
 * SECURITY NOTE: This executes arbitrary code in the browser.
 * In a production environment, consider using a sandboxed iframe
 * or Web Worker for better isolation.
 */
export function executeJavaScript(code: string): { output: string; error: string | null } {
  const logs: string[] = [];
  
  // Create a custom console that captures log output
  const customConsole = {
    log: (...args: unknown[]) => {
      logs.push(args.map(arg => formatValue(arg)).join(' '));
    },
    error: (...args: unknown[]) => {
      logs.push('[ERROR] ' + args.map(arg => formatValue(arg)).join(' '));
    },
    warn: (...args: unknown[]) => {
      logs.push('[WARN] ' + args.map(arg => formatValue(arg)).join(' '));
    },
    info: (...args: unknown[]) => {
      logs.push('[INFO] ' + args.map(arg => formatValue(arg)).join(' '));
    },
  };

  try {
    // Wrap the code to provide our custom console
    const wrappedCode = `
      (function(console) {
        ${code}
      })
    `;
    
    // Create and execute the function
    const fn = new Function('console', `
      ${code}
    `);
    
    const result = fn(customConsole);
    
    // If there's a return value and no logs, show it
    let output = logs.join('\n');
    if (result !== undefined && logs.length === 0) {
      output = formatValue(result);
    }
    
    return {
      output: output || 'Code executed successfully (no output)',
      error: null,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      output: logs.join('\n'),
      error: errorMessage,
    };
  }
}

/**
 * Format a value for display in the output panel.
 */
function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}
