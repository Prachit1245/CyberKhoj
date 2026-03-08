/**
 * CyberKhoj brand logo component.
 * Magnifying glass with lightning bolt icon + styled text.
 */

interface CyberKhojLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
}

const SIZES = {
  sm: { icon: 22, text: "text-lg", tagline: "text-[10px]" },
  md: { icon: 28, text: "text-xl", tagline: "text-xs" },
  lg: { icon: 40, text: "text-3xl", tagline: "text-sm" },
  xl: { icon: 56, text: "text-5xl", tagline: "text-base" },
};

export default function HackMindLogo({
  size = "md",
  showText = true,
  showTagline = false,
  className = "",
}: CyberKhojLogoProps) {
  const s = SIZES[size];
  const iconSize = s.icon;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Magnifying glass with lightning bolt */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 32 32"
        fill="none"
        className="shrink-0"
        aria-hidden="true"
      >
        {/* Glass circle */}
        <circle
          cx="13"
          cy="13"
          r="9"
          stroke="#39ff14"
          strokeWidth="2.2"
          fill="none"
        />
        {/* Handle */}
        <line
          x1="19.8"
          y1="19.8"
          x2="28"
          y2="28"
          stroke="#39ff14"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Lightning bolt inside glass */}
        <path
          d="M14.5 7L10 14.5h3.5L12 19.5 18 12h-3.5L16.5 7z"
          fill="#39ff14"
        />
      </svg>

      {/* Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`font-heading ${s.text} leading-none flex items-center`} style={{ color: "#39ff14" }}>
            <span className="font-normal">Cyber</span>
            <span className="font-bold">Khoj</span>
            <span
              className="inline-block w-[2px] ml-0.5 bg-[#39ff14] rounded-sm"
              style={{
                height: "1em",
                animation: "blink-cursor 1s step-end infinite",
              }}
            />
          </span>
          {showTagline && (
            <span className={`font-mono ${s.tagline} text-muted-foreground mt-0.5`}>
              Think Like A Hacker
            </span>
          )}
        </div>
      )}

      <style>{`
        @keyframes blink-cursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/**
 * Static icon-only version for favicons and PWA.
 */
export function getCyberKhojIconSVG(size: number = 512): string {
  const s = size;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" fill="none">
    <rect width="${s}" height="${s}" rx="${Math.round(s * 0.15)}" fill="#0a0a0a"/>
    <circle cx="${s * 0.406}" cy="${s * 0.406}" r="${s * 0.28}" stroke="#39ff14" stroke-width="${Math.round(s * 0.04)}" fill="none"/>
    <line x1="${s * 0.62}" y1="${s * 0.62}" x2="${s * 0.875}" y2="${s * 0.875}" stroke="#39ff14" stroke-width="${Math.round(s * 0.055)}" stroke-linecap="round"/>
    <path d="M${s * 0.453} ${s * 0.219}L${s * 0.313} ${s * 0.453}h${s * 0.109}L${s * 0.375} ${s * 0.609} ${s * 0.563} ${s * 0.375}h-${s * 0.109}L${s * 0.516} ${s * 0.219}z" fill="#39ff14"/>
  </svg>`;
}

export const CYBERKHOJ_BRAND = {
  name: "CyberKhoj",
  tagline: "Think Like A Hacker",
  description: "AI-powered vulnerability analysis, attack surface mapping, and recon",
  colors: {
    primary: "#39ff14",
    primaryHsl: "hsl(110 100% 55%)",
    background: "#0a0a0a",
  },
  social: {
    github: "https://github.com/cyberkhoj-app/cyberkhoj",
    discord: "https://discord.gg/lovable-dev",
  },
} as const;
