export type FindingRisk = "high" | "medium" | "low";

export type FindingStatus = "needs_review" | "low_confidence";

export type BoanMode = "basic" | "blue" | "red" | "purple";

export interface FindingEvidence {
  filePath: string;
  lineNumber: number;
  linePreview: string;
}

export interface Finding {
  id: string;
  category: string;
  risk: FindingRisk;
  status: FindingStatus;
  title: string;
  message: string;
  evidence: FindingEvidence;
}

export interface FindingsFile {
  schemaVersion: 1;
  generatedAt: string;
  projectRoot: string;
  mode: BoanMode;
  findings: Finding[];
}

export interface ScanProjectOptions {
  write?: boolean;
  mode?: BoanMode;
  diff?: boolean;
  registryFetch?: typeof fetch;
}

export interface ReportOptions {
  projectRoot?: string;
  mode?: BoanMode;
  top?: number;
}
