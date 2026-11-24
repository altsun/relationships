# Contributing

- Open an issue for substantial changes. Keep reports, screenshots, logs, and test fixtures synthetic.
- Use Node.js 24 and pnpm 11.25.0 (as in CI). Install with `pnpm install --frozen-lockfile` from the repository root.
- Follow [AGENTS.md](AGENTS.md) for project-specific conventions.
- Run `pnpm --filter api exec node --import tsx --test 'test/*.test.cjs'`, `pnpm build:api`, and `pnpm build:web` before submitting a PR.
- Use separate Clerk and PostgreSQL instances for development and preview deployments. Never use production credentials or personal records for testing.
- Add regression tests for changes to authentication, authorization, or data validation.
- Contributions are licensed under the same [AGPL-3.0-only license](LICENSE). Only submit code you have the right to license.

Report security issues privately as described in [SECURITY.md](SECURITY.md).
