const FINDINGS_KEY = "hackmind_findings";

export type FindingSeverity = "Critical" | "High" | "Medium" | "Low" | "Info";
export type FindingStatus = "Draft" | "Submitted" | "Triaged" | "Resolved" | "Duplicate";
export type FindingPlatform = "HackerOne" | "Bugcrowd" | "Private" | "Other";

export const VULN_TYPES = [
  "IDOR", "SQLi", "XSS", "AuthBypass", "SSRF", "RCE", "LFI", "CSRF",
  "RaceCondition", "BusinessLogic", "InfoDisclosure", "JWT", "GraphQL",
  "OpenRedirect", "FileUpload", "SSTI", "XXE", "Deserialization",
  "BrokenAccessControl", "MassAssignment", "Other",
] as const;

export type VulnType = (typeof VULN_TYPES)[number];

export interface Finding {
  id: string;
  title: string;
  targetDomain: string;
  vulnType: VulnType;
  severity: FindingSeverity;
  description: string;
  stepsToReproduce: string;
  pocNote: string;
  bountyEarned: number | null;
  platform: FindingPlatform;
  status: FindingStatus;
  createdAt: string;
  updatedAt: string;
}

export const getFindings = (): Finding[] => {
  try {
    return JSON.parse(localStorage.getItem(FINDINGS_KEY) || "[]");
  } catch { return []; }
};

const saveFindings = (findings: Finding[]) => {
  localStorage.setItem(FINDINGS_KEY, JSON.stringify(findings));
};

export const addFinding = (finding: Finding): void => {
  const findings = getFindings();
  findings.unshift(finding);
  saveFindings(findings);
  // Achievement check (lazy import to avoid circular deps)
  import("@/lib/achievements").then(m => m.checkBugLogger());
};

export const updateFinding = (id: string, partial: Partial<Finding>): void => {
  const findings = getFindings().map((f) =>
    f.id === id ? { ...f, ...partial, updatedAt: new Date().toISOString() } : f
  );
  saveFindings(findings);
};

export const deleteFinding = (id: string): void => {
  saveFindings(getFindings().filter((f) => f.id !== id));
};

export const exportFindingsMarkdown = (findings: Finding[]): string => {
  const totalBounty = findings.reduce((s, f) => s + (f.bountyEarned || 0), 0);
  const lines = [
    `# Bug Bounty Findings Report`,
    ``,
    `Generated: ${new Date().toLocaleString()}`,
    `Total Findings: ${findings.length}`,
    `Total Bounty Earned: $${totalBounty.toLocaleString()}`,
    ``,
    `---`,
    ``,
  ];

  for (const f of findings) {
    lines.push(`## ${f.title}`);
    lines.push(``);
    lines.push(`| Field | Value |`);
    lines.push(`|-------|-------|`);
    lines.push(`| **Target** | ${f.targetDomain} |`);
    lines.push(`| **Type** | ${f.vulnType} |`);
    lines.push(`| **Severity** | ${f.severity} |`);
    lines.push(`| **Status** | ${f.status} |`);
    lines.push(`| **Platform** | ${f.platform} |`);
    if (f.bountyEarned) lines.push(`| **Bounty** | $${f.bountyEarned.toLocaleString()} |`);
    lines.push(`| **Date** | ${new Date(f.createdAt).toLocaleDateString()} |`);
    lines.push(``);
    lines.push(`### Description`);
    lines.push(f.description);
    lines.push(``);
    lines.push(`### Steps to Reproduce`);
    lines.push(f.stepsToReproduce);
    lines.push(``);
    if (f.pocNote) {
      lines.push(`### Proof of Concept`);
      lines.push(f.pocNote);
      lines.push(``);
    }
    lines.push(`---`);
    lines.push(``);
  }

  return lines.join("\n");
};
