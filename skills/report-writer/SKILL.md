---
name: report-writer
description: Source skill draft for writing cautious Markdown reports from findings.json for developer, internal, client, blue, red simulation, and purple audiences.
---

# Name

report-writer

## Purpose

Write audience-appropriate Markdown reports from `.boan-sensei/findings.json` and related review notes. Preserve cautious language and avoid overstating security impact.

## When to use

Use this skill when a user wants a developer TODO, internal sharing report, client-facing report, blue mode report, red simulation report, or purple mode report from collected findings.

## Inputs

- `.boan-sensei/findings.json`.
- Existing generated Markdown reports when available.
- Requested audience or mode.
- Optional notes from narrower review skills.

## Review scope

- Developer TODO.
- Internal sharing.
- Client-facing submission.
- Blue mode.
- Red simulation mode.
- Purple mode.

## Output format

Return Markdown with:

- Title.
- Scope and limitations.
- Summary.
- Findings or review candidates.
- Recommended checks.
- Human review reminder.

For developer TODO output, prefer checkbox lists. For client-facing output, avoid raw speculation and emphasize review status.

## Safe wording

Use cautious wording:

- Review candidate.
- Needs review.
- Recommended check.
- Code signal detected.
- Supporting material.
- 점검 후보.
- 확인 필요.
- 검토 권장.
- 코드 신호 발견.

## Avoid wording

Avoid wording that certifies safety or confirms compromise:

- Vulnerability found.
- Attack succeeded.
- Exploit confirmed.
- Completely safe.
- Security guaranteed.
- 취약점 발견.
- 공격 성공.
- 익스플로잇 확인.
- 완전 안전.
- 보안 보증.

Do not present generated reports as penetration test results, security certification, or final security decisions.

## Example output

```markdown
# Frontend Security Review Candidates

This report summarizes code signals detected in local frontend files. It is supporting material for human review and does not confirm security impact.

## Recommended checks

- [ ] Confirm whether browser storage contains sensitive authentication data.
- [ ] Review HTML rendering paths that may receive editor content.
```
