import { Copy, Check, Users, Wifi, WifiOff, Code2 } from 'lucide-react';
import { useState } from 'react';

interface TopBarProps {
  sessionId?: string;
  isConnected?: boolean;
  connectedUsers?: number;
}

/**
 * Top navigation bar component.
 * 
 * Features:
 * - App branding with logo
 * - Session ID display (when in a session)
 * - Copy session link functionality
 * - Connection status indicator
 * - Connected users count
 */
export function TopBar({ sessionId, isConnected = false, connectedUsers = 1 }: TopBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between">
      {/* Left: Logo and App Name */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Code2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-foreground">CodePair</span>
        </div>
      </div>

      {/* Center: Session ID (if in session) */}
      {sessionId && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-md">
            <span className="text-sm text-muted-foreground">Session:</span>
            <code className="text-sm font-mono font-medium text-foreground">{sessionId}</code>
          </div>
          
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-3 py-1.5 bg-secondary hover:bg-accent text-secondary-foreground rounded-md transition-colors text-sm"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-success" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy link</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Right: Connection Status and Users */}
      {sessionId && (
        <div className="flex items-center gap-4">
          {/* Connected Users */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{connectedUsers}</span>
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-1.5">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-success" />
                <span className="text-xs text-success">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Offline</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Empty right section for landing page */}
      {!sessionId && <div />}
    </header>
  );
}
