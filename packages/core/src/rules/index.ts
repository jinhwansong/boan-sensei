// 새 카테고리 규칙을 추가할 때는 이 디렉터리에 파일을 만들고 이 index.ts에 등록하세요.
import { DEBUG_RULES } from "./debug.js";
import { DOM_RULES } from "./dom.js";
import { DYNAMIC_EXECUTION_RULES } from "./dynamic-execution.js";
import { NETWORK_RULES } from "./network.js";
import { SECRET_RULES } from "./secrets.js";
import type { ScanRule } from "./types.js";

export type { ScanRule } from "./types.js";

export const SCAN_RULES: ScanRule[] = [
  ...DOM_RULES,
  ...NETWORK_RULES.slice(0, 5),
  DEBUG_RULES[0],
  ...SECRET_RULES,
  NETWORK_RULES[5],
  ...DYNAMIC_EXECUTION_RULES,
  ...DEBUG_RULES.slice(1)
];
