import type { BoanMode } from "./types.js";

export const DEFAULT_MODE: BoanMode = "basic";

export const REPORT_FILE_BY_MODE: Record<BoanMode, string> = {
  basic: "SECURITY_REPORT.md",
  blue: "SECURITY_BLUE_TEAM.md",
  red: "SECURITY_RED_TEAM_SIMULATION.md",
  purple: "SECURITY_PURPLE_TEAM.md"
};

export const BOAN_MODES: BoanMode[] = ["basic", "blue", "red", "purple"];

export function isBoanMode(value: string): value is BoanMode {
  return BOAN_MODES.includes(value as BoanMode);
}

export function resolveMode(value: string | undefined): BoanMode {
  if (value === undefined || value === "") {
    return DEFAULT_MODE;
  }

  if (isBoanMode(value)) {
    return value;
  }

  throw new Error("지원하지 않는 mode입니다. basic/blue/red/purple 중 하나를 사용하세요.");
}
