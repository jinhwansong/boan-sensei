import type { FindingConfidence, FindingRisk, FindingStatus } from "../types.js";

export interface ScanRule {
  ruleId?: string;
  keyword?: string;
  pattern?: RegExp;
  category: string;
  risk: FindingRisk;
  status?: FindingStatus;
  confidence?: FindingConfidence;
  title: string;
  message: string;
  recommendation?: string;
  redQuestion?: string;
}
