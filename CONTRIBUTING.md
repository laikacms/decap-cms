# Contributing

Contributions are welcome — large or small. Please read the [Code of Conduct](./CODE_OF_CONDUCT.md) before getting started.

For documentation contributions, see the [website repo](https://github.com/decaporg/decap-website).

## Setup

You'll need:

- **Node 22+** (LTS recommended). The repo's `.nvmrc` pins the supported major.
- **pnpm 9+** — `corepack enable pnpm` is the easiest way to get the version pinned in `package.json#packageManager`.

Clone and install:

```sh
git clone https://github.com/decaporg/decap-cms
cd decap-cms
pnpm install
```

## Running locally

```sh
pnpm start            # alias for `pnpm develop`: turbo --parallel develop
```

`pnpm start` watches every package, rebuilds on change, and serves `dev-test/` at `http://localhost:8080/`. Edit `dev-test/config.yml` to point at the backend you want to exercise (see "Debugging" below).

## Common scripts

| Script | What it does |
| --- | --- |
| `pnpm start` / `pnpm develop` | Watch & rebuild every package; serve the dev test site. |
| `pnpm build` | Build all packages via `turbo run build`. |
| `pnpm clean` | Remove every `dist/` directory. |
| `pnpm reset` | `clean` plus removing `node_modules`. |
| `pnpm test` | Lint + type-check + unit tests. |
| `pnpm test:unit` | Vitest only. |
| `pnpm test:unit:watch` | Vitest in watch mode. |
| `pnpm test:e2e` | Build the demo site and run Cypress headless. |
| `pnpm test:e2e:dev` | Cypress in watch mode against `pnpm develop`. |
| `pnpm lint` | ESLint + Stylelint + Prettier check. |
| `pnpm format` | ESLint `--fix` + Prettier `--write`. |
| `pnpm type-check` | `tsc --noEmit` across the workspace. |

## Pull requests

We actively welcome PRs. If you need help with Git or our workflow, ask in our [community chat](https://decapcms.org/chat).

We use [GitHub Flow](https://docs.github.com/en/get-started/quickstart/github-flow) with rebase-merge:

1. Fork and create a branch from `main`. Prefix the branch with the issue number when applicable.
2. Add tests for new behavior.
3. Update docs when you change the public API.
4. Run `pnpm test` before opening the PR.
5. Run `pnpm format` to apply lint/formatting fixes.
6. Rebase onto `main` before requesting review and again before merging.
7. PRs require approval from two maintainers before merge.

## Debugging

`pnpm start` builds Decap CMS and serves `dev-test/index.html` and `dev-test/config.yml`. To exercise a specific config or backend:

1. Replace `dev-test/config.yml` with the one you want to debug. For backend testing, set the `backend` block to the provider you're targeting:

   ```yaml
   backend:
     name: github
     repo: owner-name/repo-name
   ```

2. (Optional) Replace `dev-test/index.html` to load Decap from the freshly built `dist/`:

   ```html
   <!DOCTYPE html>
   <html>
     <head>
       <meta charset="utf-8" />
       <title>Decap CMS</title>
     </head>
     <body>
       <script src="dist/decap-cms.js"></script>
     </body>
   </html>
   ```

3. Run `pnpm start` and open `http://localhost:8080/`.

### Debugging Git Gateway

You'll need a Netlify site with [Git Gateway](https://docs.netlify.com/visitor-access/git-gateway/) and [Netlify Identity](https://docs.netlify.com/visitor-access/identity/) enabled — the [Gatsby starter](https://app.netlify.com/start/deploy?repository=https://github.com/decaporg/gatsby-starter-decap-cms&stack=cms) is the fastest way to get one. Then point the local CMS at it via the browser console:

```js
localStorage.setItem('netlifySiteURL', 'https://your-site.netlify.app/');
```

Refresh the page and log in via Netlify Identity.

### Running a focused test

Vitest accepts file globs and `-t` for test name filters:

```sh
# All tests for one file
npx vitest run packages/decap-cms-backend-gitlab/src/__tests__/gitlab.spec.tsx

# Tests whose name matches a pattern
npx vitest run -t "should call editorialWorkflowGit"
```

Use `pnpm test:unit:watch` to keep Vitest open while you iterate.

## Releasing

Decap CMS publishes via npm trusted publishers (OIDC) — no NPM tokens are needed in CI.

### Release process

1. **Version bump.** Update the `version` of each package you intend to release. Conventional-commit history determines the bump level. Commit on `main`.

2. **Tag.** Push a tag in the form `decap-<package>@<version>`, e.g. `decap-cms@4.1.0`. The publish workflow in `.github/workflows/publish.yml` triggers on tags matching `decap-*@*`.

3. **Automated publish.** GitHub Actions runs the workspace tests, builds packages, and runs `pnpm publish -r --access public --no-git-checks` with OIDC auth. Provenance attestations are generated automatically.

4. **GitHub release.** Open the [Releases](https://github.com/decaporg/decap-cms/releases) page, draft a new release from the just-pushed tag, and add release notes.

### Manual publishing (emergency only)

If automated publishing fails:

```sh
npm login                       # interactive, with 2FA
pnpm publish -r --access public # from the workspace root
```

## License

By contributing, you agree your contributions are licensed under the project's [MIT License](./LICENSE).
