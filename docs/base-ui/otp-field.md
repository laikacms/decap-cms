# OTP Field

Status: rejected

Base UI's OTP Field (`@base-ui/react/otp-field`) is a segmented one-time-code input: `OTPField.Root`
(owns the code value, `length`, `validationType="numeric" | "alphanumeric"`, paste distribution,
`autoSubmit`, `onValueComplete`) with one `OTPField.Input` per character slot and an optional
`OTPField.Separator`. It composes with Field/Form for labeling and submission.

## Findings: no code-entry step exists anywhere in the CMS

Every authentication path in the repo either delegates interactive login (including any 2FA the
provider enforces) to an external window, or is a plain credentials form:

- `src/lib/auth/implicit-oauth.ts` and `src/lib/auth/pkce-oauth.ts`: OAuth in a popup
  (`openWindow`/redirect + `completeAuth`); GitHub/GitLab/Gitea/Bitbucket TOTP prompts happen on the
  provider's hosted page inside that popup, never in CMS UI.
- `src/lib/auth/netlify-auth.ts`: Netlify's OAuth relay, also popup-message based.
- Backend `AuthenticationPage`s
  (`src/backends/github|gitlab|gitea|bitbucket|azure|
  git-gateway|aws-cognito-github-proxy/AuthenticationPage.tsx`)
  render a login button only; `src/backends/proxy` and `src/backends/test` log straight in. None
  renders a text entry for a token or verification code.
- The single credentials form, `src/ui/auth/NetlifyAuthenticationPage.tsx:191-213` (git-gateway
  email/password), has no confirmation-code step: Netlify Identity's email-confirmation and recovery
  flows run through the hosted `netlifyIdentity` widget (lines 69-79, 122-129), not through
  CMS-rendered inputs.

A repo-wide search for OTP, one-time, and verification-code strings confirms nothing relevant (the
only hits are an emoji list entry, a color picker, and config validation).

## Motivation for rejection

There is no surface on which an OTP field could appear: the CMS never handles second-factor or
verification codes itself, by design, since auth is delegated to git providers and identity services
that render their own challenge UI. Adopting the component would add an export with guaranteed zero
call sites. The realistic future trigger is a first-party credentialed backend that implements its
own TOTP or email-code challenge in CMS UI (for example, an expanded aws-cognito flow with
`CUSTOM_CHALLENGE`/MFA); if that lands, `OTPField.Root` + per-slot `OTPField.Input` inside the
adopted `Field` kit (`field.md`) with `autoSubmit` is the correct implementation, and nothing in the
current design-system work blocks it.
