import { Check, X, Minus } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

interface Row {
  feature: string;
  hackmind: "yes" | "no" | "partial" | string;
  paid: "yes" | "no" | "partial" | string;
}

const ROWS: Row[] = [
  { feature: "Price", hackmind: "$0 forever", paid: "$50–$200/mo" },
  { feature: "Privacy", hackmind: "100% local browser", paid: "Cloud — your data on their servers" },
  { feature: "Account Required", hackmind: "no", paid: "yes" },
  { feature: "AI Attack Paths", hackmind: "yes", paid: "partial" },
  { feature: "OWASP Mapping", hackmind: "yes", paid: "yes" },
  { feature: "Payload Library", hackmind: "yes", paid: "partial" },
  { feature: "Mind Map Visualization", hackmind: "yes", paid: "no" },
  { feature: "Daily Limit", hackmind: "1,000 analyses", paid: "50–500 scans" },
  { feature: "Offline Capable (PWA)", hackmind: "yes", paid: "no" },
];

function CellIcon({ value }: { value: string }) {
  if (value === "yes") return <Check size={18} className="text-primary mx-auto" aria-label="Yes" />;
  if (value === "no") return <X size={18} className="text-destructive mx-auto" aria-label="No" />;
  if (value === "partial") return <Minus size={18} className="text-muted-foreground mx-auto" aria-label="Partial" />;
  return <span className="text-sm font-mono">{value}</span>;
}

const ComparisonTable = () => {
  const { ref, visible } = useScrollReveal<HTMLDivElement>(0.1);

  return (
    <section ref={ref} className="relative py-20 md:py-28 px-4 bg-background">
      <div
        className={`max-w-3xl mx-auto space-y-10 transition-all duration-700 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div className="text-center space-y-3">
          <h2 className="text-2xl md:text-4xl font-heading font-extrabold text-foreground">
            HackMind vs{" "}
            <span className="text-muted-foreground line-through decoration-destructive">Paid Tools</span>
          </h2>
          <p className="text-sm md:text-base text-muted-foreground font-mono max-w-lg mx-auto">
            Why pay when free is better?
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left" role="table">
            <thead>
              <tr className="border-b border-border bg-card">
                <th className="px-4 py-3 text-xs font-mono uppercase tracking-widest text-muted-foreground">Feature</th>
                <th className="px-4 py-3 text-center text-xs font-mono uppercase tracking-widest text-primary">
                  HackMind
                </th>
                <th className="px-4 py-3 text-center text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  Paid Tools
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr
                  key={row.feature}
                  className={`border-b border-border/50 transition-all duration-500 ${
                    visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
                  style={{ transitionDelay: `${i * 60 + 200}ms` }}
                >
                  <td className="px-4 py-3 text-sm font-mono text-foreground">{row.feature}</td>
                  <td className="px-4 py-3 text-center text-sm font-mono text-foreground">
                    <CellIcon value={row.hackmind} />
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-mono text-muted-foreground">
                    <CellIcon value={row.paid} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default ComparisonTable;
