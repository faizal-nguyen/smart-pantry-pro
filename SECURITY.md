# Security

This document describes how Smart Pantry Pro keeps secrets out of the
repository, the bundle, and the public network — and what to do if a
secret slips through.

## TL;DR

- **Never** put a real API key in any committed file.
- Server-side secrets live in `apps/api/.env` (untracked).
- Anything prefixed `VITE_*` is **public** the moment it ships in a
  client bundle. No secret should ever wear that prefix.
- A pre-commit hook and a CI workflow verify this. They fail loudly
  rather than silently letting a leak ship.

## What counts as a secret?

| Category | Examples |
|---|---|
| AI providers | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `DEEPGRAM_API_KEY` |
| Cloud / infra | `AWS_*`, `GCP_*`, `AZURE_*` keys, private SSH/PEM keys |
| Media | `CLOUDINARY_API_SECRET` (the `cloud_name` and `api_key` are public) |
| Search / scraping | `PILOTERR_API_KEY` and similar third-party scraping tokens |
| Supabase | `SUPABASE_SERVICE_KEY` (service_role JWT). The `anon` key is public but RLS-bound. |
| App-specific | `JWT_SECRET`, `ENCRYPTION_KEY`, `WEBHOOK_SIGNING_SECRET` |

## Where secrets live

- **Local dev**: `apps/api/.env` (untracked) and `.env.local` (untracked).
  `.env.development`, `.env.staging`, `.env.production` are explicitly
  ignored — see `.gitignore`.
- **Hosted envs**: deployment provider env vars (Vercel / Render / Fly /
  GitHub Actions secrets). Never commit these into the repo.
- **Templates**: `.env.example` and `apps/api/.env.example` only — they
  must contain placeholder values, never live keys.

The client bundle (Vite) only sees variables prefixed `VITE_*`. Add a
new `VITE_*` entry **only** if the value is intended to be public.

## Tooling (PRP-220.03)

### Local commands

```bash
# Full OWASP baseline (passes/warnings/failures)
npm run security:check

# Secret pattern scan over every tracked file
npm run security:secrets

# Same scan but only over the files staged in the current commit
npm run security:secrets:staged
```

The scanner exits with:

- `0` — no findings.
- `2` — at least one secret pattern matched. The output lists file +
  pattern + truncated sample. Real-looking placeholders
  (`your-`, `test-`, `fake-`, ...) are filtered out automatically.

If you genuinely need to commit a value that the scanner flags, extend
`IGNORE_RX` inside `scripts/security-baseline-check.cjs` and add a
short comment explaining why it is safe.

### Pre-commit hook (Husky)

Husky is configured via `prepare` in `package.json`. Running
`npm install` once installs `.husky/pre-commit`, which:

1. Refuses to commit any `.env*` (other than `.env.example`).
2. Runs the secret scanner on the staged files only.

Skipping the hook with `--no-verify` is allowed for genuine emergencies.
The CI workflow re-runs the same checks, so a bypassed local commit
still fails on the PR.

### CI workflow

`.github/workflows/security.yml` runs on every PR and push to `main`:

1. `node scripts/security-baseline-check.cjs --secrets-only` over the
   full tree.
2. `git ls-files` must not list any `.env*` (other than `.example`).

A red `Security Baseline` check blocks the merge.

## What to do if a secret leaks

This has happened — see `SECURITY_INCIDENT_2026-05.md` for the full
record. The procedure is, in order:

1. **Revoke** the credential at the provider. Do this *before* anything
   else: a rotated key cannot be abused even if the attacker already
   downloaded the repo.
2. **Generate** a new credential and store it in the secret manager
   (1Password / hosting provider env / etc.), never in the repo.
3. **Untrack** the leaking file (`git rm --cached <path>`) and add the
   path to `.gitignore`.
4. Commit the cleanup on a dedicated branch named `chore/security-*`,
   open a PR, and let CI re-validate.
5. Update `SECURITY_INCIDENT_<date>.md` with the timeline (no values).
6. **Decide whether to rewrite history.** For a public repo, the secret
   has almost certainly been scraped already; rotation is the only
   effective mitigation. Force-pushing rewritten history to a public
   `main` breaks every fork and clone — rarely worth the cost.

## Reporting a vulnerability

- Internal: open a `security/*` issue in the repo (private if possible)
  and mention `@security` (or the current security owner).
- External: please do not file a public GitHub issue. Email the project
  owner with the details and a suggested CVSS rating; we will respond
  within 72 hours.

## References

- `SECURITY_INCIDENT_2026-05.md` — first multi-key incident.
- PRP-220.01 — rotation + repo cleanup.
- PRP-220.02 — migration of `VITE_*` AI secrets to server-side endpoints.
- PRP-220.03 — this file, the scanner, the hook, the CI workflow.
