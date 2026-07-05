export type FindingRisk = "high" | "medium" | "low";

export type FindingStatus = "needs_review";

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
  findings: Finding[];
}

export interface ScanProjectOptions {
  write?: boolean;
}

export interface ReportOptions {
  projectRoot?: string;
}
