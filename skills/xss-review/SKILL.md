---
name: xss-review
description: Source skill draft for collecting XSS and HTML rendering review candidates without asserting that XSS is present.
---

# Name

xss-review

## Purpose

Collect XSS and HTML rendering review candidates from frontend code. Frame findings as questions about data origin, sanitization, and render path.

## When to use

Use this skill when a user asks about XSS, HTML rendering, rich text editors, sanitized content, user-generated content, or dangerous DOM APIs.

## Inputs

- Components and utilities that render HTML.
- Editor input, persistence, and display flows.
- Sanitization helper code.
- Existing `.boan-sensei/findings.json` when available.

## Review scope

- `dangerouslySetInnerHTML`.
- `innerHTML`.
- `outerHTML`.
- `insertAdjacentHTML`.
- DOMPurify usage.
- Editor input value storage and rendering flow.

`boan-sensei scan` collects static review candidates for `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, and `insertAdjacentHTML`; it still does not assert that XSS is present.

## Output format

Return a Markdown table:

| Candidate | Location | Data source question | Sanitization question | Recommended check |
| --- | --- | --- | --- | --- |

## Safe wording

Use cautious wording:

- HTML rendering review candidate.
- Needs review.
- Recommended check.
- Code signal detected.
- Confirm whether external input can reach this render path.
- 점검 후보.
- 확인 필요.
- 검토 권장.
- 코드 신호 발견.

## Avoid wording

Avoid wording that asserts XSS:

- XSS vulnerability found.
- Exploitable XSS.
- Script injection confirmed.
- Attack succeeded.
- Completely safe.
- XSS 취약점 발견.
- 스크립트 삽입 가능.
- 공격 성공.
- 완전 안전.

Do not claim an XSS vulnerability. Ask whether external input can reach the render path and whether sanitization is applied correctly.

## Example output

```markdown
| Candidate | Location | Data source question | Sanitization question | Recommended check |
| --- | --- | --- | --- | --- |
| HTML rendering review candidate | `src/components/PostBody.tsx` | Can user-provided editor content reach this prop? | Is DOMPurify or equivalent sanitization applied before rendering? | Trace editor save and display flow before release. |
```
