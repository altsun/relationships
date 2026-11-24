# Open-source release gate

This checklist is deliberately not a declaration that the hosted service is secure. Keep the repository private until all release-blocking items are verified by the maintainer.

## Repository and history

- [ ] Confirm the maintainer has rights to all code and assets and approves AGPL-3.0-only licensing.
- [ ] Require the **Secret history scan** and **Relationships checks** workflows to pass. The scan checks reachable history from fetched branches and tags; it does not prove that no secret or personal data ever existed.
- [ ] Independently inspect all refs, deleted branches/PR refs when accessible, commit metadata, issues, PR descriptions/reviews, attachments, release assets, and CI logs/artifacts for real personal data, deployment identifiers and credentials. Review screenshots visually. Review private commit emails before publication.
- [ ] If a real secret is found, revoke/rotate it first, remove it from all affected refs/history, and re-scan. If sensitive history cannot be cleaned confidently, publish a fresh sanitized repository instead. Do not put secret values in an issue or log.
- [ ] Enable private vulnerability reporting, branch protection and dependency/security alerts where available. Check public fork PRs cannot access secrets.

## Production, preview and demo

- [ ] Set up a production Clerk instance with restricted sign-up/invitations as appropriate. Use separate Clerk instances and databases for development, previews and demo.
- [ ] Verify that every API route is authenticated and scoped to the current account. Repeat cross-account read/write/delete tests against a staging deployment using synthetic data only.
- [ ] Set `WEB_ORIGIN` to the exact allowed web origins, never a wildcard. Verify preview origins separately.
- [ ] Configure a **shared** rate limit on the public API at the hosting/provider edge or via a distributed store, including authenticated requests. An in-memory counter is not reliable on serverless deployments. Start with a conservative per-client limit, test 429 responses, and adjust for normal UI behavior. No provider rule is created by this repository.
- [ ] Ensure untrusted PR previews cannot receive production secrets or read/write production data. Verify deployment env scopes explicitly in Vercel and Cloudflare.
- [ ] Configure database least privilege, backup/restore, log redaction, retention, and deletion/export procedures appropriate to the data. Verify error responses and logs do not disclose personal records.
- [ ] Confirm production access is independent of repository visibility. Do not publish the personal instance URL or real data in the README/demo.
- [ ] Prepare demo screenshots and documentation using fictional contacts and separate infrastructure. Make the corresponding source accessible to users of the hosted AGPL version as required by the license.
- [ ] Obtain explicit maintainer approval before changing repository visibility. Making a repository public also makes previously private discussions and reachable history public and can be difficult to reverse completely.

## Local secret scan

Install Gitleaks from its official releases, fetch all relevant refs in a private clone, and run:

```sh
git fetch --all --tags --prune
gitleaks git --redact=100 --log-opts="--all --full-history -m" .
gitleaks dir --redact=100 .
```

Inspect findings privately. Do not create broad ignore rules simply to get a green build. Gitleaks detects patterns, not all forms of personal information; manual privacy review remains required.
