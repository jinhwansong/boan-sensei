---
name: external-content-review
description: Source skill draft for reviewing iframe, embed, external link, window.open, postMessage, and CSP frame-src candidates.
---

# Name

external-content-review

## Purpose

Collect review candidates related to external content boundaries, browser navigation, embedded content, and cross-window messaging.

## When to use

Use this skill when a user asks about iframes, embeds, external links, `window.open`, `postMessage`, content security policy, or third-party content.

## Inputs

- Frontend components that embed or open external content.
- Link helpers and shared UI components.
- Message event handlers.
- CSP configuration when present.
- Existing `.boan-sensei/findings.json` when available.

## Review scope

- `iframe` and `embed` usage locations.
- Allowed domain policy.
- `target="_blank"` and `rel` attributes.
- `window.open`.
- `postMessage`.
- CSP `frame-src` confirmation.
- Static scans should not confirm CSP absence; treat only code-level CSP strings and policy references as review signals.

## Output format

Return a Markdown checklist grouped by boundary:

- Embedded content.
- External navigation.
- Cross-window messaging.
- CSP or policy follow-up.

Each item should include location, signal, and recommended check.

## Safe wording

Use cautious wording:

- External content review candidate.
- Needs review.
- Recommended check.
- Code signal detected.
- Policy confirmation needed.
- 점검 후보.
- 확인 필요.
- 검토 권장.
- 코드 신호 발견.

## Avoid wording

Avoid wording that confirms exploitation or policy failure:

- Sandbox bypass confirmed.
- postMessage exploit found.
- Clickjacking confirmed.
- Attack succeeded.
- Completely safe.
- 우회 확인.
- 공격 성공.
- 완전 안전.
- 보안 보증.

Do not perform external URL scanning or live third-party probing. Assume the user owns or has permission to review the project.

## Example output

```markdown
## External navigation

- Code signal detected: external link uses `target="_blank"`.
- Location: `src/components/ExternalLink.tsx`
- Recommended check: confirm `rel="noopener noreferrer"` is consistently applied.
```
