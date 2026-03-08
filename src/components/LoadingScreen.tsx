/**
 * Full-screen loading screen with CyberKhoj branding.
 * Used during initial app load and route transitions.
 */
import HackMindLogo from "@/components/HackMindLogo";

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = "Initializing..." }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background">
      {/* Background effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(110_100%_55%/0.05)_0%,transparent_70%)]" />
      
      {/* Logo */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        <HackMindLogo size="xl" showText={true} showTagline={true} />
        
        {/* Loading indicator */}
        <div className="flex items-center gap-3 mt-4">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-primary animate-pulse"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
          <span className="text-sm font-mono text-muted-foreground">{message}</span>
        </div>
      </div>
      
      {/* Version/tagline */}
      <div className="absolute bottom-8 text-center">
        <p className="text-xs font-mono text-muted-foreground/50">
          Free AI-Powered Vulnerability Analysis
        </p>
      </div>
    </div>
  );
}
