/**
 * Dark-themed shimmer loading skeletons for HackMind.
 * Uses CSS animation with hsl design tokens.
 */

export function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div className={`h-4 rounded-md bg-muted/40 animate-pulse ${className}`} />
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-border/30 bg-card/50 p-5 space-y-3 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-muted/40 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded-md bg-muted/40 animate-pulse" />
          <div className="h-3 w-1/2 rounded-md bg-muted/30 animate-pulse" />
        </div>
      </div>
      <div className="h-3 w-full rounded-md bg-muted/30 animate-pulse" />
      <div className="h-3 w-2/3 rounded-md bg-muted/20 animate-pulse" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border/30 bg-card/50 overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 border-b border-border/30">
        <div className="h-3 w-24 rounded bg-muted/40 animate-pulse" />
        <div className="h-3 w-16 rounded bg-muted/30 animate-pulse" />
        <div className="h-3 w-12 rounded bg-muted/30 animate-pulse" />
        <div className="h-3 w-20 rounded bg-muted/20 animate-pulse" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-b border-border/20 last:border-0">
          <div className="h-3 w-32 rounded bg-muted/30 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
          <div className="h-3 w-16 rounded bg-muted/20 animate-pulse" style={{ animationDelay: `${i * 100 + 50}ms` }} />
          <div className="h-3 w-10 rounded bg-muted/20 animate-pulse" style={{ animationDelay: `${i * 100 + 100}ms` }} />
          <div className="h-3 w-20 rounded bg-muted/15 animate-pulse" style={{ animationDelay: `${i * 100 + 150}ms` }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-pulse">
      {/* Title */}
      <div className="space-y-2">
        <div className="h-8 w-64 rounded-lg bg-muted/40" />
        <div className="h-4 w-48 rounded-md bg-muted/20" />
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-border/30 bg-card/50 p-5 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-muted/40" />
            <div className="h-7 w-16 rounded bg-muted/40" />
            <div className="h-3 w-24 rounded bg-muted/20" />
          </div>
        ))}
      </div>
      {/* Charts placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-5 w-32 rounded bg-muted/30" />
          <div className="rounded-xl border border-border/30 bg-card/50 h-40" />
          <div className="rounded-xl border border-border/30 bg-card/50 h-32" />
        </div>
        <div className="space-y-4">
          <div className="h-5 w-28 rounded bg-muted/30" />
          <div className="rounded-xl border border-border/30 bg-card/50 h-64" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonAnalyzer() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-pulse">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-border/30 pb-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 w-20 rounded bg-muted/30" />
        ))}
      </div>
      {/* Textarea */}
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-muted/20" />
        <div className="h-28 rounded-xl border border-border/30 bg-card/50" />
      </div>
      {/* Options */}
      <div className="flex gap-4">
        <div className="h-10 w-40 rounded-lg bg-muted/30" />
        <div className="h-10 w-32 rounded-lg bg-muted/20" />
      </div>
      {/* Button */}
      <div className="h-12 w-40 rounded-lg bg-primary/20" />
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-6 w-48 rounded-lg bg-muted/40" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
