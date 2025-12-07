import { useEffect, useRef, useState } from 'react';
import { X, Video, VideoOff, Mic, MicOff } from 'lucide-react';
import { Socket } from 'socket.io-client';
import { useWebRTC } from '@/hooks/useWebRTC';

interface HuddlePanelProps {
  sessionId: string;
  socket: Socket | null;
  onClose: () => void;
}

const VideoFeed = ({ stream, isLocal = false, label }: { stream: MediaStream, isLocal?: boolean, label?: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative bg-muted rounded-lg overflow-hidden aspect-video">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // Mute local video to prevent feedback
        className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
      />
      <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white">
        {label || (isLocal ? 'You' : 'Peer')}
      </div>
    </div>
  );
};

export function HuddlePanel({ sessionId, socket, onClose }: HuddlePanelProps) {
  const [isJoined, setIsJoined] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const { localStream, peers, toggleAudio, toggleVideo } = useWebRTC({
    sessionId,
    socket,
    isEnabled: isJoined
  });

  const handleToggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled);
    toggleAudio(!isAudioEnabled);
  };

  const handleToggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
    toggleVideo(!isVideoEnabled);
  };

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

      {/* Content */}
      <div className="flex-1 bg-muted/30 p-4 overflow-y-auto">
        {!isJoined ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Video className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Join Team Huddle</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-[200px]">
              Connect with your team using voice and video directly in the editor.
            </p>
            <button
              onClick={() => setIsJoined(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
            >
              Join Huddle
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Controls */}
            <div className="flex justify-center gap-2 mb-4">
              <button
                onClick={handleToggleAudio}
                className={`p-2 rounded-full ${isAudioEnabled ? 'bg-secondary hover:bg-secondary/80' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}`}
                title={isAudioEnabled ? "Mute Microphone" : "Unmute Microphone"}
              >
                {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>
              <button
                onClick={handleToggleVideo}
                className={`p-2 rounded-full ${isVideoEnabled ? 'bg-secondary hover:bg-secondary/80' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}`}
                title={isVideoEnabled ? "Turn Off Camera" : "Turn On Camera"}
              >
                {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsJoined(false)}
                className="p-2 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                title="Leave Huddle"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Grid */}
            <div className="grid grid-cols-1 gap-4">
              {/* Local User */}
              {localStream && (
                <VideoFeed stream={localStream} isLocal={true} />
              )}

              {/* Remote Peers */}
              {peers.map((peer) => (
                peer.stream && (
                  <VideoFeed
                    key={peer.peerId}
                    stream={peer.stream}
                    label={`Peer ${peer.peerId.substring(0, 4)}`}
                  />
                )
              ))}

              {peers.length === 0 && localStream && (
                <div className="text-center text-xs text-muted-foreground py-4">
                  Waiting for others to join...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
