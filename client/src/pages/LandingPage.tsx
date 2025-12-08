import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code2, Users, Zap, Globe, Sparkles, Loader2, PenTool } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { generateSessionId } from '@/lib/sessionUtils';
import { createSession } from '@/lib/api';

/**
 * Landing page component.
 * 
 * Features:
 * - Collaboration-focused messaging for CodePair
 * - "Create new session" button that generates a random session ID
 * - Navigates to /session/:sessionId on click
 */
export function LandingPage() {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateSession = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const session = await createSession();
      navigate(`/session/${session.sessionId}`);
    } catch {
      // Offline or backend unavailable: fall back to local ID
      const sessionId = generateSessionId();
      setError('Backend is unavailable; starting a local-only session.');
      navigate(`/session/${sessionId}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopBar />

      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="max-w-2xl mx-auto text-center animate-fade-in">
          {/* Hero Icon */}
          <div className="mb-8 inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 shadow-glow">
            <Code2 className="w-10 h-10 text-primary" />
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4 tracking-tight">
            CodeCanvas
          </h1>

          {/* Subheadline */}
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Real-time collaboration suite for developers. Code, draw, and talk in one shared space.
          </p>

          {/* CTA Button */}
          <button
            onClick={handleCreateSession}
            disabled={isCreating}
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow-lg hover:shadow-glow transition-all duration-200 text-lg"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating workspace...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Start a Session
              </>
            )}
          </button>
          {error && (
            <p className="mt-3 text-sm text-amber-600" role="alert">
              {error}
            </p>
          )}

          {/* Features Grid */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Code2 className="w-6 h-6" />}
              title="Code"
              description="Multi-language editor with real-time cursors and execution."
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Connect"
              description="Built-in video huddles for face-to-face collaboration."
            />
            <FeatureCard
              icon={<PenTool className="w-6 h-6" />}
              title="Create"
              description="Interactive whiteboard for diagramming and brainstorming."
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-muted-foreground">
        Built for collaborative coding, learning, and huddles.
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
      <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center text-accent-foreground mb-4 mx-auto">
        {icon}
      </div>
      <h3 className="font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
