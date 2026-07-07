import type { FindingRisk, FindingStatus } from "../types.js";

export interface ScanRule {
  keyword?: string;
  pattern?: RegExp;
  category: string;
  risk: FindingRisk;
  status?: FindingStatus;
  title: string;
  message: string;
}
