import { X, Video } from 'lucide-react';

interface HuddlePanelProps {
  sessionId: string;
  onClose: () => void;
}

/**
 * HuddlePanel component - embedded video call panel.
 * 
 * Uses an iframe to embed a video room. The URL pattern is:
 * https://VIDEO_SERVICE/room/{sessionId}
 * 
 * Currently uses a placeholder URL that can be swapped for a real
 * video provider (Daily.co, Whereby, Jitsi, etc.) later.
 */
export function HuddlePanel({ sessionId, onClose }: HuddlePanelProps) {
  // Placeholder URL - swap with real video provider later
  // Examples:
  // - Daily.co: https://your-domain.daily.co/{sessionId}
  // - Whereby: https://whereby.com/{sessionId}
  // - Jitsi: https://meet.jit.si/{sessionId}
  const videoRoomUrl = `https://example.com/room/${sessionId}`;

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-secondary/50 border-b border-border">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Huddle</span>
          <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
            beta
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-accent rounded-md transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Close huddle"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Video iframe container */}
      <div className="flex-1 bg-muted/30 relative min-h-0">
        <iframe
          src={videoRoomUrl}
          title="Huddle video call"
          className="absolute inset-0 w-full h-full border-0"
          allow="camera; microphone; display-capture; fullscreen"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
        
        {/* Placeholder overlay - remove when using real provider */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/80 backdrop-blur-sm">
          <Video className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground text-center px-4">
            Team huddle placeholder
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1 text-center px-4">
            Drop in your video provider to bring voice/video into the workspace
          </p>
          <code className="text-xs mt-3 px-3 py-1.5 bg-secondary rounded-md text-muted-foreground font-mono">
            Room: {sessionId}
          </code>
        </div>
      </div>
    </div>
  );
}
