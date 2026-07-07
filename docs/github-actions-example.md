# GitHub Actions Example

`.github/workflows/boan-sensei-example.yml` is an example workflow for posting boan-sensei review candidates on pull requests.

It is not a mandatory CI gate. Copy and adapt it for a target project.

The example flow is:

1. Checkout.
2. Install dependencies with pnpm.
3. Build boan-sensei from this repository.
4. Run `boan-sensei scan --mode basic --diff`.
5. Run `boan-sensei pr-comment`.
6. Post `.boan-sensei/pr-comment.md` to the pull request with `peter-evans/create-or-update-comment@v4`.

In a user project, clone this repository separately or use a future distributed package before running the CLI.

The generated comment is supporting material for review candidates. It does not confirm security impact.
