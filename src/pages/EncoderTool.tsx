import { useMemo, useState } from "react";
import { Copy, ArrowDownUp, Wand2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/Toast";
import { ENCODERS, runEncoder, type EncoderId } from "@/lib/encoders";
import { usePageTitle } from "@/hooks/usePageTitle";

const EncoderTool = () => {
  usePageTitle("Encoder / Decoder — CyberKhoj");
  const [id, setId] = useState<EncoderId>("base64");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [input, setInput] = useState("");

  const current = ENCODERS.find((e) => e.id === id)!;
  const effectiveMode = current.encode ? mode : "decode";
  const { output, error } = useMemo(
    () => (input ? runEncoder(id, effectiveMode, input) : { output: "" }),
    [id, effectiveMode, input]
  );

  const chainAll = useMemo(() => {
    if (!input) return [];
    return ENCODERS.filter((e) => e.encode).map((e) => ({
      id: e.id,
      label: e.label,
      ...runEncoder(e.id, "encode", input),
    }));
  }, [input]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };

  const useAsInput = () => {
    if (!output) return;
    setInput(output);
    setMode(effectiveMode === "encode" ? "decode" : "encode");
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Payload Encoder / Decoder</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Works fully offline in your browser — nothing is sent anywhere. Handy for WAF bypass tests, token inspection and quick decoding.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Encoding type">
        {ENCODERS.map((e) => (
          <button
            key={e.id}
            role="tab"
            aria-selected={id === e.id}
            onClick={() => setId(e.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-mono border transition-colors ${
              id === e.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {(["encode", "decode"] as const).map((m) => (
          <Button
            key={m}
            size="sm"
            variant={effectiveMode === m ? "default" : "outline"}
            disabled={m === "encode" && !current.encode}
            onClick={() => setMode(m)}
          >
            {m === "encode" ? "Encode" : "Decode"}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="enc-input" className="text-xs font-mono text-muted-foreground">INPUT</label>
            <Button size="sm" variant="ghost" onClick={() => setInput("")} disabled={!input} aria-label="Clear input">
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
          <Textarea
            id="enc-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Paste text to ${effectiveMode}…  e.g. <script>alert(1)</script>`}
            className="min-h-[200px] font-mono text-sm"
            spellCheck={false}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground">OUTPUT</span>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={useAsInput} disabled={!output} aria-label="Use output as input">
                <ArrowDownUp className="w-4 h-4" aria-hidden="true" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => copy(output)} disabled={!output} aria-label="Copy output">
                <Copy className="w-4 h-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
          <Textarea
            readOnly
            value={output}
            className="min-h-[200px] font-mono text-sm"
            placeholder="Result appears here"
            aria-label="Output"
          />
          {error && <p className="text-xs text-destructive font-mono">⚠ {error}</p>}
        </div>
      </div>

      {chainAll.length > 0 && (
        <section aria-labelledby="all-enc">
          <h2 id="all-enc" className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-primary" aria-hidden="true" /> All encodings of your input
          </h2>
          <div className="grid gap-2">
            {chainAll.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-3 flex items-start gap-3">
                  <span className="text-xs font-mono text-secondary w-32 shrink-0">{r.label}</span>
                  <code className="flex-1 text-xs font-mono break-all text-foreground/90">{r.error ? `⚠ ${r.error}` : r.output}</code>
                  <Button size="sm" variant="ghost" onClick={() => copy(r.output)} disabled={!!r.error} aria-label={`Copy ${r.label}`}>
                    <Copy className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default EncoderTool;
