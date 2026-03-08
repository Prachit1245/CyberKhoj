const Index = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-extrabold tracking-tight text-glow-primary">
          <span className="text-primary">Hack</span>
          <span className="text-secondary">Mind</span>
        </h1>
        <p className="text-lg text-muted-foreground font-mono max-w-md mx-auto">
          &gt; AI-powered toolkit for the curious mind_
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <span className="inline-block h-1 w-12 rounded bg-primary animate-pulse-glow" />
          <span className="inline-block h-1 w-8 rounded bg-secondary animate-pulse-glow" style={{ animationDelay: '0.5s' }} />
          <span className="inline-block h-1 w-16 rounded bg-primary animate-pulse-glow" style={{ animationDelay: '1s' }} />
        </div>
      </div>
    </div>
  );
};

export default Index;
