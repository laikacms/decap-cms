---
'@laikacms/decap-cms': minor
---

Add personal access token (PAT) login for the git backends. The login screen for github, gitlab,
gitea, bitbucket and azure now offers a token form next to OAuth, so a backend works without an
OAuth app or auth server. The entered token is preserved across a failed login attempt instead of
clearing the field.
