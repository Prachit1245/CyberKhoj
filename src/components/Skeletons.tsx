/**
 * Dark-themed shimmer loading skeletons for HackMind.
 * Uses a shimmer gradient animation over dark #1a1a1a base.
 */

const shimmerClass =
  "relative overflow-hidden bg-[hsl(0_0%_10%)] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-[hsl(0_0%_14%)] before:to-transparent";

export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`h-4 rounded-md ${shimmerClass} ${className}`} />;
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-border/30 bg-card/50 p-5 space-y-3 ${className}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${shimmerClass}`} />
        <div className="flex-1 space-y-2">
          <div className={`h-4 w-3/4 rounded-md ${shimmerClass}`} />
          <div className={`h-3 w-1/2 rounded-md ${shimmerClass}`} />
        </div>
      </div>
      <div className={`h-3 w-full rounded-md ${shimmerClass}`} />
      <div className={`h-3 w-2/3 rounded-md ${shimmerClass}`} />
    </div>
  );
}

export function SkeletonTable({ rows = 10 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border/30 bg-card/50 overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 border-b border-border/30">
        <div className={`h-3 w-8 rounded ${shimmerClass}`} />
        <div className={`h-3 w-32 rounded ${shimmerClass}`} />
        <div className={`h-3 w-16 rounded ${shimmerClass}`} />
        <div className={`h-3 w-12 rounded ${shimmerClass}`} />
        <div className={`h-3 w-20 rounded ${shimmerClass}`} />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-b border-border/20 last:border-0 items-center">
          <div className={`h-4 w-4 rounded ${shimmerClass}`} />
          <div className={`h-3 w-40 rounded ${shimmerClass}`} style={{ animationDelay: `${i * 80}ms` }} />
          <div className={`h-5 w-20 rounded-full ${shimmerClass}`} style={{ animationDelay: `${i * 80 + 40}ms` }} />
          <div className={`h-3 w-10 rounded ${shimmerClass}`} style={{ animationDelay: `${i * 80 + 80}ms` }} />
          <div className={`h-1.5 flex-1 rounded-full ${shimmerClass}`} style={{ animationDelay: `${i * 80 + 120}ms` }} />
          <div className={`h-3 w-20 rounded ${shimmerClass}`} style={{ animationDelay: `${i * 80 + 160}ms` }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonStatCards() {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-xl border border-border/30 bg-card/50 p-4 md:p-5 space-y-2 md:space-y-3">
          <div className={`w-10 h-10 rounded-lg ${shimmerClass}`} />
          <div className={`h-7 w-16 rounded ${shimmerClass}`} />
          <div className={`h-3 w-24 rounded ${shimmerClass}`} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Title */}
      <div className="space-y-2">
        <div className={`h-8 w-64 rounded-lg ${shimmerClass}`} />
        <div className={`h-4 w-48 rounded-md ${shimmerClass}`} />
      </div>
      <SkeletonStatCards />
      {/* Charts placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className={`h-5 w-32 rounded ${shimmerClass}`} />
          <div className={`rounded-xl border border-border/30 bg-card/50 h-40 ${shimmerClass}`} />
          <div className={`rounded-xl border border-border/30 bg-card/50 h-32 ${shimmerClass}`} />
        </div>
        <div className="space-y-4">
          <div className={`h-5 w-28 rounded ${shimmerClass}`} />
          <div className={`rounded-xl border border-border/30 bg-card/50 h-64 ${shimmerClass}`} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonAnalyzer() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-border/30 pb-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-4 w-20 rounded ${shimmerClass}`} />
        ))}
      </div>
      {/* Textarea */}
      <div className="space-y-2">
        <div className={`h-3 w-24 rounded ${shimmerClass}`} />
        <div className={`h-28 rounded-xl border border-border/30 bg-card/50 ${shimmerClass}`} />
      </div>
      {/* Options */}
      <div className="flex gap-4">
        <div className={`h-10 w-40 rounded-lg ${shimmerClass}`} />
        <div className={`h-10 w-32 rounded-lg ${shimmerClass}`} />
      </div>
      {/* Button */}
      <div className={`h-12 w-40 rounded-lg ${shimmerClass}`} />
    </div>
  );
}

/** 5 skeleton result cards for analysis results */
export function SkeletonResultCards() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="rounded-xl border border-border/30 bg-card/50 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className={`h-5 w-5 rounded ${shimmerClass}`} />
            <div className={`h-4 flex-1 max-w-[60%] rounded ${shimmerClass}`} />
            <div className={`h-5 w-16 rounded-full ${shimmerClass}`} />
          </div>
          <div className={`h-3 w-full rounded ${shimmerClass}`} />
          <div className={`h-3 w-4/5 rounded ${shimmerClass}`} />
          <div className="flex gap-2 pt-1">
            <div className={`h-6 w-24 rounded ${shimmerClass}`} />
            <div className={`h-6 w-20 rounded ${shimmerClass}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Mind map skeleton — tree-shaped layout */
export function SkeletonMindMap() {
  return (
    <div className="flex-1 flex items-center justify-center" style={{ background: "#0a0a0a" }}>
      <svg viewBox="0 0 600 400" className="w-full max-w-2xl h-auto opacity-40">
        {/* Root node */}
        <rect x="250" y="175" width="100" height="50" rx="25" className={`fill-[hsl(0_0%_10%)]`} stroke="hsl(110 100% 55% / 0.3)" strokeWidth="2">
          <animate attributeName="opacity" values="0.3;0.6;0.3" dur="1.8s" repeatCount="indefinite" />
        </rect>

        {/* Category branches */}
        {[
          { cx: 100, cy: 80, w: 90, h: 36 },
          { cx: 100, cy: 175, w: 90, h: 36 },
          { cx: 100, cy: 270, w: 90, h: 36 },
          { cx: 100, cy: 340, w: 90, h: 36 },
          { cx: 450, cy: 60, w: 90, h: 36 },
          { cx: 450, cy: 140, w: 90, h: 36 },
          { cx: 450, cy: 230, w: 90, h: 36 },
          { cx: 450, cy: 320, w: 90, h: 36 },
        ].map((n, i) => (
          <g key={i}>
            <line
              x1={n.cx < 300 ? n.cx + n.w / 2 : n.cx - n.w / 2}
              y1={n.cy}
              x2={n.cx < 300 ? 250 : 350}
              y2={200}
              stroke="hsl(110 100% 55% / 0.1)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <rect
              x={n.cx - n.w / 2}
              y={n.cy - n.h / 2}
              width={n.w}
              height={n.h}
              rx="8"
              className="fill-[hsl(0_0%_10%)]"
              stroke="hsl(0 0% 20%)"
              strokeWidth="1"
            >
              <animate attributeName="opacity" values="0.2;0.5;0.2" dur="1.8s" begin={`${i * 0.15}s`} repeatCount="indefinite" />
            </rect>
          </g>
        ))}

        {/* Leaf nodes */}
        {[
          { cx: 20, cy: 50 }, { cx: 20, cy: 110 },
          { cx: 20, cy: 245 }, { cx: 20, cy: 295 },
          { cx: 580, cy: 40 }, { cx: 580, cy: 80 },
          { cx: 580, cy: 210 }, { cx: 580, cy: 250 },
          { cx: 580, cy: 300 }, { cx: 580, cy: 340 },
        ].map((n, i) => (
          <rect
            key={`leaf-${i}`}
            x={n.cx - 25}
            y={n.cy - 12}
            width="50"
            height="24"
            rx="4"
            className="fill-[hsl(0_0%_8%)]"
            stroke="hsl(0 0% 16%)"
            strokeWidth="0.5"
          >
            <animate attributeName="opacity" values="0.15;0.35;0.15" dur="1.8s" begin={`${i * 0.1}s`} repeatCount="indefinite" />
          </rect>
        ))}
      </svg>
    </div>
  );
}

/** History page skeleton — header + search + rows */
export function SkeletonHistory() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className={`h-6 w-24 rounded ${shimmerClass}`} />
          <div className={`h-3 w-36 rounded ${shimmerClass}`} />
        </div>
        <div className={`h-9 w-28 rounded-lg ${shimmerClass}`} />
      </div>
      {/* Filters */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-7 w-20 rounded-full ${shimmerClass}`} />
        ))}
      </div>
      {/* Table */}
      <SkeletonTable rows={10} />
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="space-y-6">
      <div className={`h-6 w-48 rounded-lg ${shimmerClass}`} />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
