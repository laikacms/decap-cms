# Security Policy

Decap CMS takes security seriously. This document outlines our security policy, supported versions,
and how to report security vulnerabilities.

## Supported Versions

Security updates are provided for:

| Version           | Status                | Lifecycle              |
| ----------------- | --------------------- | ---------------------- |
| 4.x               | ✅ Actively Supported | Current stable release |
| 3.x               | ❌ Unsupported        | Legacy - no updates    |
| 2.x (Netlify CMS) | ❌ Unsupported        | Legacy - no updates    |
| 1.x (Netlify CMS) | ❌ Unsupported        | Legacy - no updates    |

**Note:** Decap CMS was renamed from Netlify CMS in February 2023. Versions 1.x, 2.x, and 3.x are no
longer maintained. We recommend upgrading to version 4.x for security updates and new features.

## Reporting a Vulnerability

If you discover a security vulnerability in Decap CMS, please report it **confidentially** through
GitHub Security Advisories. This allows us to investigate and address the issue without exposing it
to the public until a fix is ready.

**Submit your report at:** https://github.com/laikacms/decap-cms/security/advisories/new

### What NOT to Do

- Do not open a public GitHub issue for the vulnerability
- Do not post details on social media or public forums
- Do not attempt to exploit the vulnerability beyond confirming it exists
- Do not access data beyond what's necessary to demonstrate the issue

## Response Timeline

This project follows a 90-day disclosure timeline.

## Security Practices

- Dependabot is enabled for automated security update checks
- All code changes are tested in CI, including linting
- End-to-end tests provide coverage of critical functionality
- Pull requests are expected to be reviewed by a maintainer before merging; this is a contributor
  convention, not a GitHub branch-protection rule (`main` currently has no required-review or
  required-status-check protection configured)
- Passwords are not stored by Decap CMS; authentication is delegated to providers

## Known Limitations

- This is a **community-maintained open-source project**, not a commercial product with dedicated
  security resources
- Security depends on the stability and practices of underlying dependencies and backend providers
- Some vulnerabilities in dependencies may not be immediately patchable if they break backwards
  compatibility
- This is a project with a long history, and many legacy dependencies can't be updated without
  significant refactoring
