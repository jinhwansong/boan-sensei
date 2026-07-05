---
name: token-auth-review
description: Source skill draft for reviewing authentication and token handling flows as review candidates without claiming authentication bypass is possible.
---

# Name

token-auth-review

## Purpose

Review authentication and token management flows as security review candidates. Focus on storage locations, renewal order, and error handling paths.

## When to use

Use this skill when a user asks about frontend authentication, access tokens, refresh tokens, login state, 401 handling, or token renewal after page refresh.

## Inputs

- Auth-related frontend source files.
- API client, interceptor, middleware, and route guard code.
- Existing `.boan-sensei/findings.json` when available.
- Notes about token storage and backend session behavior when provided by the user.

## Review scope

- Access token storage location.
- Refresh token handling pattern.
- `localStorage`, `sessionStorage`, and `document.cookie` usage.
- 401 handling flow.
- Authentication renewal order after page refresh.

## Output format

Return a Markdown checklist:

- Token or auth flow candidate.
- Storage or transition point.
- File or location when known.
- Question to verify.
- Recommended check.

## Safe wording

Use cautious wording:

- Review candidate.
- Needs review.
- Recommended check.
- Code signal detected.
- Token storage needs review.
- Auth flow needs review.
- 점검 후보.
- 확인 필요.
- 검토 권장.
- 코드 신호 발견.

## Avoid wording

Avoid wording that confirms auth bypass or compromise:

- Authentication bypass confirmed.
- Token leak confirmed.
- Account takeover possible.
- Attack succeeded.
- Completely safe.
- 인증 우회 가능.
- 토큰 탈취 확인.
- 공격 성공.
- 완전 안전.

Do not claim that authentication bypass is possible. Summarize storage locations and flows as items that need review.

## Example output

```markdown
## Token storage

- Code signal detected: access token appears to be read from `localStorage`.
- Location: `src/api/client.ts`
- Question to verify: can this value contain a bearer token or another sensitive credential?
- Recommended check: confirm the intended storage policy for access and refresh tokens.
```
