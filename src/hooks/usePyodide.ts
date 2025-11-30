import { useEffect, useRef, useState, useCallback } from 'react';

// Pyodide types (simplified for our use case)
interface PyodideInterface {
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (options: { batched: (msg: string) => void }) => void;
  setStderr: (options: { batched: (msg: string) => void }) => void;
}

declare global {
  interface Window {
    loadPyodide?: (config: { indexURL: string }) => Promise<PyodideInterface>;
  }
}

interface UsePyodideReturn {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  runPython: (code: string) => Promise<{ output: string; error: string | null }>;
}

/**
 * Custom hook for loading and using Pyodide (Python in WebAssembly).
 * 
 * This hook:
 * - Loads the Pyodide runtime from CDN on first use
 * - Provides a method to execute Python code in the browser
 * - Captures stdout and stderr from Python execution
 * - Handles loading states and errors gracefully
 * 
 * Pyodide is only loaded when the user first tries to run Python code,
 * to avoid unnecessary loading if the user only uses JavaScript.
 */
export function usePyodide(): UsePyodideReturn {
  const pyodideRef = useRef<PyodideInterface | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Pyodide script if not already loaded
  const loadPyodideScript = useCallback(async (): Promise<void> => {
    if (window.loadPyodide) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Pyodide script'));
      document.head.appendChild(script);
    });
  }, []);

  // Initialize Pyodide runtime
  const initPyodide = useCallback(async (): Promise<PyodideInterface> => {
    if (pyodideRef.current) return pyodideRef.current;

    setIsLoading(true);
    setError(null);

    try {
      // Load the script first
      await loadPyodideScript();

      if (!window.loadPyodide) {
        throw new Error('Pyodide loader not available');
      }

      // Initialize Pyodide
      const pyodide = await window.loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
      });

      pyodideRef.current = pyodide;
      setIsReady(true);
      setIsLoading(false);
      return pyodide;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Python runtime';
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    }
  }, [loadPyodideScript]);

  // Run Python code
  const runPython = useCallback(async (code: string): Promise<{ output: string; error: string | null }> => {
    try {
      const pyodide = await initPyodide();
      
      // Capture stdout
      let stdout = '';
      let stderr = '';

      pyodide.setStdout({
        batched: (msg: string) => {
          stdout += msg + '\n';
        },
      });

      pyodide.setStderr({
        batched: (msg: string) => {
          stderr += msg + '\n';
        },
      });

      // Run the code
      const result = await pyodide.runPythonAsync(code);

      // Combine output
      let output = stdout.trim();
      
      // If there's a return value and no stdout, show the return value
      if (result !== undefined && result !== null && !output) {
        output = String(result);
      }

      return {
        output: output || 'Code executed successfully (no output)',
        error: stderr.trim() || null,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      return {
        output: '',
        error: errorMessage,
      };
    }
  }, [initPyodide]);

  // Cleanup
  useEffect(() => {
    return () => {
      pyodideRef.current = null;
    };
  }, []);

  return {
    isLoading,
    isReady,
    error,
    runPython,
  };
}
