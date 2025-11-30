import { useNavigate } from 'react-router-dom';
import { Code2, Users, Zap, Globe } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { generateSessionId } from '@/lib/sessionUtils';

/**
 * Landing page component.
 * 
 * Features:
 * - App description and value proposition
 * - "Create new session" button that generates a random session ID
 * - Navigates to /session/:sessionId on click
 */
export function LandingPage() {
  const navigate = useNavigate();

  const handleCreateSession = () => {
    const sessionId = generateSessionId();
    navigate(`/session/${sessionId}`);
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
            Code Together,{' '}
            <span className="text-primary">Anywhere</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
            A real-time collaborative coding environment for technical interviews. 
            Write, run, and discuss code together.
          </p>

          {/* CTA Button */}
          <button
            onClick={handleCreateSession}
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow-lg hover:shadow-glow transition-all duration-200 text-lg"
          >
            <Zap className="w-5 h-5" />
            Create New Session
          </button>

          {/* Features Grid */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Globe className="w-6 h-6" />}
              title="Multi-Language"
              description="Support for JavaScript, Python, and SQL with syntax highlighting"
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="Instant Execution"
              description="Run code directly in your browser with real-time output"
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Real-Time Collab"
              description="See changes instantly as your team types"
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-muted-foreground">
        Built for seamless technical interviews
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
