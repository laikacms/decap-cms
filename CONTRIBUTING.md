# CONTRIBUTING

Contributions are always welcome, no matter how large or small. Before contributing,
please read the [code of conduct](CODE_OF_CONDUCT.md).

For details on contributing to documentation, see [Website Readme](https://github.com/decaporg/decap-website/blob/main/README.md).

## Setup

> Install [Node.js (LTS)](https://nodejs.org/) on your system.

### Install dependencies

```sh
git clone https://github.com/decaporg/decap-cms
cd decap-cms
pnpm install
```

### Run locally

```sh
pnpm dev
```

`pnpm dev` builds the `dev-test`, `laika-demo`, and `laika-bare-demo` bundles, then watches and serves `dev-test/` at `http://localhost:5174`.

## Available scripts

Decap CMS is a single package (`@laikacms/decap-cms`) under `src/`, not a Lerna/npm-workspace monorepo of `packages/decap-cms-<name>/` packages. There is one `package.json` and one set of scripts for the whole tree.

### clean

Removes the `dist` and `.turbo` directories.

```sh
pnpm clean
```

### build

Type-checks and builds the library to `dist/`.

```sh
pnpm build
```

### build:dev-test

Builds the `dev-test`, `laika-demo`, and `laika-bare-demo` demo bundles.

```sh
pnpm build:dev-test
```

### test

Runs the Vitest unit test suite.

```sh
pnpm test
```

### test:ci

Runs lint, typecheck, and the Vitest unit test suite — the same gate CI runs.

```sh
pnpm test:ci
```

### test:e2e

Runs the Playwright end-to-end tests (`playwright/`).

```sh
pnpm test:e2e
```

### lint

Lints `src/**/*.{ts,tsx,js,mjs}` with ESLint.

```sh
pnpm lint
```

### format

Formats `src/**/*.{ts,tsx,css}` with Prettier.

```sh
pnpm format
```

## Pull Requests

We actively welcome your pull requests!

If you need help with Git or our workflow, please ask in our [community chat](https://decapcms.org/chat). We want your contributions even if you're just learning Git. Our maintainers are happy to help!

Decap CMS uses the [Forking Workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/forking-workflow) + [Feature Branches](https://www.atlassian.com/git/tutorials/comparing-workflows/feature-branch-workflow). Additionally, PR's should be [rebased](https://www.atlassian.com/git/tutorials/merging-vs-rebasing) on main when opened, and again before merging.

1. Fork the repo.
2. Create a branch from `main`. If you're addressing a specific issue, prefix your branch name with the issue number.
3. If you've added code that should be tested, add tests.
4. If you've changed APIs, update the documentation.
5. Run `pnpm test:ci` and ensure lint, typecheck, and the test suite pass.
6. Use `pnpm format` to format your code.
7. PR's must be rebased before merge (feel free to ask for help).
8. PR should be reviewed by two maintainers prior to merging.

## Debugging

`pnpm dev` spawns a development server and uses `dev-test/config.yml` and `dev-test/index.html` to serve the CMS.
In order to debug a specific issue follow the next steps:

1. Replace `dev-test/config.yml` with the relevant `config.yml`. If you want to test the backend, make sure that the `backend` property of the config indicates which backend you use (GitHub, Gitlab, Bitbucket etc) and path to the repo.

```js
backend:
  name: github
  repo: owner-name/repo-name
```

2. Change the content of `dev-test/index.html` to:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Decap CMS</title>
  </head>
  <body>
    <script src="dist/decap-cms.js"></script>
    <!-- <script>
      // this is the place to add CMS customizations if you need to, e.g.
      CMS.registerPreviewTemplate('posts', PostPreview);
    </script> -->
  </body>
</html>
```
The most important thing is to make sure that Decap CMS is loaded from the `dist` folder. This way, every time you make changes to the source code, they will be compiled and reflected immediately on `localhost`.

3. Run `pnpm dev`
4. Open `http://localhost:5174/` in the browser and you should have access to the CMS

### Debugging Git Gateway

When debugging the CMS with Git Gateway you must:

1. Have a Netlify site with [Git Gateway](https://docs.netlify.com/visitor-access/git-gateway/) and [Netlify Identity](https://docs.netlify.com/visitor-access/identity/) enabled. An easy way to create such a site is to use a [template](https://www.decapcms.org/docs/start-with-a-template/), for example the [Gatsby template](https://app.netlify.com/start/deploy?repository=https://github.com/decaporg/gatsby-starter-decap-cms&stack=cms)
2. Tell the CMS the URL of your Netlify site using a local storage item. To do so:

    1. Open `http://localhost:5174/` in the browser
    2. Open the Developer Console. Write the below command and press enter: `localStorage.setItem('netlifySiteURL', 'https://yourwebsiteurl.netlify.app/')`
    3. To be sure, you can run this command as well: `localStorage.getItem('netlifySiteURL')`
    4. Refresh the page
    5. You should be able to log in via your Netlify Identity email/password

### Fine tune the way you run unit tests

There are situations where you would want to run a specific test file, or tests that match a certain pattern.

To run all the tests for a specific file, use this command:

```
npx vitest run <filename or file path>
```

Example for running all the tests for the file `gitlab.spec.ts`: `npx vitest run gitlab.spec.ts`

Some test file names like `API.spec.ts` recur across multiple directories under `src/backends/`. You can pass a regexp pattern instead of a file path to narrow down files.

Example for running all the tests for the file `API.spec.ts` under `src/backends/gitlab/`:

`npx vitest run "src/backends/gitlab/.+/API.spec.ts"`

To run a specific test in a file, add the flag `-t` followed by a regexp to match your test name.

Example for running the test "should return true on project access_level >= 30" in `src/backends/gitlab/**/API.spec.ts`:

```
npx vitest run -t "true on p" "src/backends/gitlab/.+/API.spec.ts"
```

For more information about running tests exactly the way you want, check out the official documentation for [Vitest CLI](https://vitest.dev/guide/cli.html).

## Releasing

Decap CMS uses NPM trusted publishers with OIDC for secure, automated package publishing.

### How It Works

- Publishing is automated via GitHub Actions when version tags are pushed
- Uses OpenID Connect (OIDC) for authentication. No NPM tokens required
- The single `@laikacms/decap-cms` package has a trusted publisher configured on npmjs.com
- Workflow generates short-lived, cryptographically-signed tokens automatically
- Publishes the package via `npm publish --provenance --access public`

### Release Process

1. **Prepare the release:**
  ```sh
  # Ensure your local `v4.beta` branch is up to date
  pnpm install
  pnpm test:ci

  # Bump the version and tag
  npm version <major|minor|patch>
  git push --follow-tags
  ```

2. **Automated publishing:**
   - Tags matching `v*` pushed to `v4.beta` trigger the publish workflow automatically
   - GitHub Actions runs tests, builds, and publishes the package to npm using OIDC
   - Provenance attestations are generated automatically via `npm publish --provenance`

3. **Create GitHub release:**
   - Go to [Releases](https://github.com/decaporg/decap-cms/releases)
   - Draft a new release from the tag
   - Add release notes highlighting changes

### Manual Publishing (Emergency Only)

If automated publishing fails and you need to publish manually:

```sh
# Authenticate with npm (uses session-based auth with 2FA)
npm login

# Build and publish the package
pnpm build
npm publish --provenance --access public
```

Note: Manual publishing still requires 2FA. Use recovery codes if you don't have access to your 2FA device.

## License

By contributing to Decap CMS, you agree that your contributions will be licensed
under its [MIT license](LICENSE).
