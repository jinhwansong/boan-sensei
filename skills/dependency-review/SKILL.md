---
name: dependency-review
description: Source skill draft for collecting frontend dependency review candidates from package manifests and lockfiles without checking vulnerability databases.
---

# Name

dependency-review

## Purpose

Collect frontend dependency review candidates from package manifests and lockfiles. `boan-sensei scan` now collects package presence and version strings for selected frontend dependencies, missing lockfile candidates, latest-version differences when the npm registry is reachable, and simple lockfile/package.json mismatch candidates. It still does not check vulnerability databases, so only recommend version confirmation or update review.

## When to use

Use this skill when a user asks about frontend package risk, dependency versions, lockfiles, security-sensitive libraries, or upgrade review.

## Inputs

- `package.json`.
- Lockfiles such as `pnpm-lock.yaml`, `package-lock.json`, or `yarn.lock`.
- Workspace package manifests.
- Existing `.boan-sensei/findings.json` when available. Current scan output can include selected `package.json` dependency versions, missing-lockfile review candidates, registry latest-version differences, and simple lockfile mismatch candidates.

## Review scope

- `package.json`.
- Lockfile presence.
- Security-sensitive library versions.
- Major packages such as `axios`, `dompurify`, `js-cookie`, `vite`, `next`, and `react`.
- Current automated scan coverage: existence and version string collection for the selected packages, missing lockfile detection, latest-version difference checks when registry access succeeds, and simple lockfile/package.json mismatch checks.
- Out of current automated scope: vulnerability database lookup, package advisory correlation, and confirmed vulnerable version decisions.

## Output format

Return a Markdown table:

| Package or file | Signal | Current value | Recommended check |
| --- | --- | --- | --- |

Use `unknown` when a value cannot be determined from local files.

## Safe wording

Use cautious wording:

- Version check needed.
- Update review recommended.
- Dependency review candidate.
- Code signal detected.
- Lockfile confirmation needed.
- 버전 확인 필요.
- 업데이트 검토 권장.
- 점검 후보.
- 확인 필요.

## Avoid wording

Avoid wording that claims a vulnerable version without database evidence:

- Vulnerable version found.
- Dependency exploit confirmed.
- Unsafe package.
- Completely safe.
- 취약 버전 확인.
- 익스플로잇 확인.
- 완전 안전.
- 보안 보증.

Do not run or imply vulnerability database checks unless the workflow explicitly adds that capability later.

## Example output

```markdown
| Package or file | Signal | Current value | Recommended check |
| --- | --- | --- | --- |
| `dompurify` | Security-sensitive library | `^3.0.0` | Version check needed against the team's approved dependency policy. |
| `pnpm-lock.yaml` | Lockfile present | yes | Confirm CI installs with the lockfile. |
```
