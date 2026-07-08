export type FindingRisk = "high" | "medium" | "low";

export type FindingStatus = "needs_review" | "low_confidence";

export type FindingConfidence = "high" | "medium" | "low";

export type BoanMode = "basic" | "blue" | "red" | "purple";

export interface FindingEvidence {
  filePath: string;
  lineNumber: number;
  linePreview: string;
}

export interface Finding {
  id: string;
  ruleId: string;
  confidence: FindingConfidence;
  category: string;
  risk: FindingRisk;
  status: FindingStatus;
  title: string;
  message: string;
  recommendation: string;
  redQuestion?: string;
  evidence: FindingEvidence;
}

export interface FindingsFile {
  schemaVersion: 2;
  generatedAt: string;
  projectRoot: string;
  mode: BoanMode;
  findings: Finding[];
}

export interface ScanProjectOptions {
  write?: boolean;
  mode?: BoanMode;
  diff?: boolean;
  checkLatest?: boolean;
  registryFetch?: typeof fetch;
}

export interface ReportOptions {
  projectRoot?: string;
  mode?: BoanMode;
  top?: number;
}
