---
name: frontend-security-review
description: Source skill draft for collecting broad frontend security review candidates from local project code without confirming exploitability or changing CLI behavior.
---

# Name

frontend-security-review

## Purpose

Collect broad frontend security review candidates from local project code. Treat every result as a code signal that needs human review, not as a confirmed vulnerability.

## When to use

Use this skill when a user wants a general frontend security review across browser-facing source files, or when no narrower boan-sensei skill is a better fit.

## Inputs

- Local frontend source files, usually under `src`.
- Existing `.boan-sensei/findings.json` when available.
- Project context such as framework, routing, rendering model, and environment variable conventions.

## Review scope

- Browser storage usage.
- HTML rendering risk candidates.
- External content insertion.
- External link handling.
- Public environment variable usage.
- Sourcemap and console log candidates.

## Output format

Return a Markdown list grouped by topic:

- Topic.
- Code signal detected.
- File or location when known.
- Why it needs review.
- Recommended check.

## Safe wording

Use cautious wording:

- Review candidate.
- Needs review.
- Recommended check.
- Code signal detected.
- 점검 후보.
- 확인 필요.
- 검토 권장.
- 코드 신호 발견.

## Avoid wording

Avoid wording that confirms impact or outcome:

- Vulnerability found.
- Hackable.
- Attack succeeded.
- Completely safe.
- Security guaranteed.
- 취약점 발견.
- 해킹 가능.
- 공격 성공.
- 완전 안전.
- 보안 보증.

Do not perform real attacks, penetration testing, bypassing, exploit automation, external URL scanning, or automatic source modification.

## Example output

```markdown
## Browser storage

- Code signal detected: `localStorage` is used for frontend state.
- Location: `src/auth/session.ts`
- Why it needs review: browser storage may be reachable from client-side script.
- Recommended check: confirm whether sensitive tokens or personal data can be stored here.
```
