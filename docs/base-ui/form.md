# Form

Status: proposed

Base UI's Form (`@base-ui/react/form`) is a single-part `<form>` wrapper with consolidated error
handling: it collects values from the `Field.Root`s inside it (`onFormSubmit` receives
`formValues`), runs native constraint validation plus per-field `validate` callbacks with a
configurable `validationMode` (`onSubmit` default, `onBlur`, `onChange`), merges server-side errors
passed via the `errors` prop (keyed by `Field.Root` `name`), and exposes an `actionsRef` with an
imperative `validate()`.

## Current state in this repo

There are zero imports of `@base-ui/react/form`. Actual `<form>` usage is nearly nonexistent:

- `src/ui/auth/NetlifyAuthenticationPage.tsx:34` (`AuthForm = styled.form`) is the only real form in
  the codebase: an email/password login for git-gateway via Netlify Identity. It hand-rolls exactly
  what Form provides: per-field required checks building an `errors` state object (lines 136-146), a
  server error captured into the same state (lines 152-155), and `<ErrorMessage>` paragraphs
  rendered above unlabeled inputs (lines 192-209). The inputs have `placeholder` but no `<label>`,
  and errors are not associated with their inputs.
- `src/core/components/Collection/CollectionSearch.tsx:128,170` submits search on Enter via
  `onKeyDown`, with no `<form>` element at all.
- Backend `AuthenticationPage`s (`src/backends/*/AuthenticationPage.tsx`) are single-button OAuth
  launchers with no form controls.
- The entry editor is not a form: values persist continuously to Redux and validation runs through
  `src/core/components/Editor/EditorControlPane/Widget.tsx:190`, as covered in `forms.md`.

## Proposed adoption

Rewrite the fallback login form in `NetlifyAuthenticationPage` on `Form` + the Base UI-backed `@/ui`
Field kit (which is already adopted, see `field.md`):

- `<Form errors={serverErrors} onFormSubmit={handleLogin}>` where `serverErrors` maps the
  `netlifyIdentity` failure (`e.description || e.msg`) onto a field name or a root-level entry; this
  replaces the manual `errors.server` state.
- Two `Field name="email" | "password"` blocks with `FieldLabel`,
  `Input type="email" |
  "password" required`, and
  `FieldError match="valueMissing">{t('auth.errors.email')}...`; this deletes the hand-built
  presence checks (lines 139-141) and gives the inputs real labels and `aria-describedby`-linked
  errors.

Why it is not done now: this is a user-facing login flow styled with the legacy `@/ui/default` theme
(`colorsRaw`, `lengths`, `buttons`), not the `var(--*)` token styling of the `@/ui` kit, so a
faithful conversion needs either restyling the Field kit parts to the legacy look or migrating the
page's visual layer, plus real-browser verification of the Netlify Identity paths (widget present vs
absent) that unit tests do not cover. That is a scoped follow-up, not a low-risk mechanical change.
There is no second adoption site today; new submit-style dialogs in the Laika shell should reach for
`Form` + `Field` from the start rather than `styled.form`.
