import { Shield } from "lucide-react";

/**
 * Shared ethical use disclaimer banner.
 * Used on: Landing page, Onboarding, Attack Mode, Settings.
 */
export default function EthicalDisclaimer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
        <Shield size={14} className="text-primary shrink-0 mt-0.5" />
        <p className="text-[11px] font-mono text-muted-foreground leading-relaxed">
          <span className="text-primary font-bold">Ethical use only.</span> Only test systems you own or have explicit written authorization to test. Unauthorized access is illegal.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
        <Shield size={18} className="text-primary" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-heading font-bold text-foreground">Responsible Use Only</p>
        <p className="text-xs font-mono text-muted-foreground leading-relaxed">
          CyberKhoj is designed for authorized security testing, bug bounty hunting, and educational purposes.
          Only test systems you own or have explicit written permission to test.
          Unauthorized access to computer systems is illegal under the CFAA, Computer Misuse Act, and equivalent laws worldwide.
        </p>
      </div>
    </div>
  );
}
