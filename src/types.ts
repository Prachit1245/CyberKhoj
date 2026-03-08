export type Severity = "critical" | "high" | "medium" | "low";

export type VulnCategory =
  | "IDOR"
  | "SQLi"
  | "XSS"
  | "AuthBypass"
  | "SSRF"
  | "RCE"
  | "LFI"
  | "CSRF"
  | "RaceCondition"
  | "BusinessLogic"
  | "InfoDisclosure"
  | "JWT"
  | "GraphQL"
  | "Other";

export interface AttackPath {
  id: number;
  title: string;
  category: VulnCategory | string;
  severity: Severity;
  description: string;
  payloadExample: string;
  steps: string[];
  references: string[];
  isBookmarked: boolean;
  isTested: boolean;
  userNotes: string;
}

export type InputType = "url" | "http_request" | "jwt" | "graphql" | "domain";
export type AnalysisDepth = "quick" | "standard" | "deep";

export interface AnalysisResult {
  id: string;
  input: string;
  inputType: InputType;
  paths: AttackPath[];
  createdAt: string;
  depth: AnalysisDepth;
}
