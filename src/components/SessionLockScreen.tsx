import { Lock } from "lucide-react";
import HackMindLogo from "@/components/HackMindLogo";

interface Props {
  onUnlock: () => void;
}

const SessionLockScreen = ({ onUnlock }: Props) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/95 backdrop-blur-xl">
    <div className="text-center space-y-8 max-w-sm px-6">
      <HackMindLogo size="lg" showText={true} />

      <div className="space-y-3">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Lock size={28} className="text-primary" />
        </div>
        <h2 className="font-heading text-xl font-bold text-foreground">
          Session locked for security
        </h2>
        <p className="text-sm font-mono text-muted-foreground">
          Your session was locked due to inactivity. Your API key remains safely encrypted.
        </p>
      </div>

      <button
        onClick={onUnlock}
        className="w-full rounded-lg bg-primary px-6 py-3.5 font-heading font-bold text-primary-foreground hover:brightness-110 transition-all glow-primary"
      >
        Click to Unlock
      </button>

      <p className="text-[10px] font-mono text-muted-foreground">
        🔒 API key cleared from memory · encrypted copy safe in storage
      </p>
    </div>
  </div>
);

export default SessionLockScreen;
