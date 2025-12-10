import { Copy, Check, Users, Wifi, WifiOff, Code2, Video, VideoOff } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

interface TopBarProps {
  sessionId?: string;
  isConnected?: boolean;
  connectedUsers?: number;
  isHuddleOpen?: boolean;
  onHuddleToggle?: () => void;
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
export function TopBar({ sessionId, isConnected = false, connectedUsers = 1, isHuddleOpen = false, onHuddleToggle }: TopBarProps) {
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
    <header className="min-h-14 border-b border-border bg-card px-3 sm:px-4 py-2 sm:py-0 flex flex-wrap items-center gap-2 sm:gap-4">
      {/* Left: Logo and App Name */}
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Code2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-semibold text-foreground">CodeCanvas</span>
            <span className="text-xs text-muted-foreground hidden sm:block">Real-time Collaboration</span>
          </div>
        </Link>
      </div>

      {/* Center: Session ID (if in session) */}
      {sessionId && (
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-md whitespace-nowrap">
            <span className="text-sm text-muted-foreground">Workspace:</span>
            <code className="text-sm font-mono font-medium text-foreground">{sessionId}</code>
          </div>

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-3 py-1.5 bg-secondary hover:bg-accent text-secondary-foreground rounded-md transition-colors text-sm whitespace-nowrap"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-success" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Share link</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Right: Huddle Button, Connection Status and Users */}
      {sessionId && (
        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
          {/* Huddle Toggle Button */}
          {onHuddleToggle && (
            <button
              onClick={onHuddleToggle}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isHuddleOpen
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-accent text-secondary-foreground'
                }`}
            >
              {isHuddleOpen ? (
                <>
                  <VideoOff className="w-4 h-4" />
                  <span className="hidden sm:inline">Leave huddle</span>
                </>
              ) : (
                <>
                  <Video className="w-4 h-4" />
                  <span className="hidden sm:inline">Join huddle</span>
                </>
              )}
            </button>
          )}

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
                <span className="text-xs text-success">Live sync</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Offline (local only)</span>
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
