/**
 * CyberKhoj brand logo component.
 * Renders the terminal cursor icon with optional text.
 * 
 * Brand guidelines:
 * - Always "CyberKhoj" (one word, capital C and K)
 * - Tagline: "Think Like A Hacker"
 * - Primary color: hsl(110 100% 55%) / #22c55e
 */

interface CyberKhojLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
}

const SIZES = {
  sm: { icon: 20, text: "text-lg", tagline: "text-[10px]" },
  md: { icon: 28, text: "text-xl", tagline: "text-xs" },
  lg: { icon: 40, text: "text-3xl", tagline: "text-sm" },
  xl: { icon: 56, text: "text-5xl", tagline: "text-base" },
};

export default function HackMindLogo({ 
  size = "md", 
  showText = true, 
  showTagline = false,
  className = "" 
}: CyberKhojLogoProps) {
  const s = SIZES[size];
  const iconSize = s.icon;
  const cornerRadius = Math.round(iconSize * 0.15);
  const cursorWidth = Math.round(iconSize * 0.35);
  const cursorHeight = Math.round(iconSize * 0.5);
  const cursorX = Math.round((iconSize - cursorWidth) / 2);
  const cursorY = Math.round((iconSize - cursorHeight) / 2);
  const cursorRadius = Math.round(iconSize * 0.05);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Icon */}
      <svg 
        width={iconSize} 
        height={iconSize} 
        viewBox={`0 0 ${iconSize} ${iconSize}`} 
        fill="none"
        className="shrink-0"
        aria-hidden="true"
      >
        {/* Background */}
        <rect 
          x="0" 
          y="0" 
          width={iconSize} 
          height={iconSize} 
          rx={cornerRadius} 
          fill="hsl(var(--background))"
          stroke="hsl(var(--primary))"
          strokeWidth={iconSize > 30 ? 2 : 1}
          opacity="0.8"
        />
        {/* Terminal cursor */}
        <rect 
          x={cursorX} 
          y={cursorY} 
          width={cursorWidth} 
          height={cursorHeight} 
          rx={cursorRadius} 
          fill="hsl(var(--primary))"
          className="animate-pulse"
        />
      </svg>

      {/* Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`font-heading ${s.text} font-bold text-primary text-glow-primary leading-none`}>
            CyberKhoj
          </span>
          {showTagline && (
            <span className={`font-mono ${s.tagline} text-muted-foreground mt-0.5`}>
              Think Like A Hacker
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Static icon-only version for favicons and PWA.
 * Returns raw SVG string for embedding.
 */
export function getCyberKhojIconSVG(size: number = 512): string {
  const cornerRadius = Math.round(size * 0.1875);
  const cursorWidth = Math.round(size * 0.375);
  const cursorHeight = Math.round(size * 0.5);
  const cursorX = Math.round((size - cursorWidth) / 2);
  const cursorY = Math.round((size - cursorHeight) / 2);
  const cursorRadius = Math.round(size * 0.03);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" fill="none">
    <rect x="0" y="0" width="${size}" height="${size}" rx="${cornerRadius}" fill="#0a0a0a"/>
    <rect x="${size * 0.015}" y="${size * 0.015}" width="${size * 0.97}" height="${size * 0.97}" rx="${cornerRadius - 4}" fill="none" stroke="#22c55e" stroke-width="${Math.round(size * 0.008)}" opacity="0.3"/>
    <rect x="${cursorX}" y="${cursorY}" width="${cursorWidth}" height="${cursorHeight}" rx="${cursorRadius}" fill="#22c55e"/>
  </svg>`;
}

/**
 * Brand constants for consistent usage across the app.
 */
export const CYBERKHOJ_BRAND = {
  name: "CyberKhoj",
  tagline: "Think Like A Hacker",
  description: "AI-powered vulnerability analysis, attack surface mapping, and recon",
  colors: {
    primary: "#22c55e",
    primaryHsl: "hsl(110 100% 55%)",
    background: "#0a0a0a",
  },
  social: {
    github: "https://github.com/cyberkhoj-app/cyberkhoj",
    discord: "https://discord.gg/lovable-dev",
  },
} as const;
