# Security Policy

Math Lab is a **static, client-side-only** web app: no server code, no database,
no authentication, and no secrets or user data are handled at runtime. All
computation runs in the visitor's browser. The practical attack surface is
therefore small — but we still take reports seriously.

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Instead, use GitHub's private reporting:

1. Go to the repository's **Security** tab → **Report a vulnerability**
   (GitHub Private Vulnerability Reporting), or
2. Email the maintainer at **mikecarter771@gmail.com** with details and, if
   possible, a proof of concept.

We aim to acknowledge reports within **72 hours** and to ship a fix or mitigation
for confirmed issues as quickly as is practical.

## Scope

In scope:

- XSS / content-injection in the rendered dossiers or search UI.
- Supply-chain issues in the (deliberately minimal) dependency set.
- CI/CD or repository-configuration weaknesses.

Out of scope:

- Findings that require a compromised end-user machine or browser.
- Denial of service against the static host.
- The mathematical content itself (correctness of claims) — that belongs in a
  normal issue or PR, not a security report.
