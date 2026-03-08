export interface MindMapNodeData {
  label: string;
  description: string;
  attackIdeas: string[];
  severity: "critical" | "high" | "medium" | "low" | null;
  nodeType: "root" | "category" | "attack";
  parentId: string | null;
  tested?: boolean;
  note?: string;
  searchMatch?: boolean;
  [key: string]: unknown;
}
