<p align="center">
  <img src="img/decap.svg" alt="Decap CMS" width="320" />
</p>

<p align="center">
  <em>An open‑source content management system for static sites — a clean editor on top of your Git repo.</em>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/decap-cms"><img alt="npm version" src="https://img.shields.io/npm/v/decap-cms?logo=npm&label=decap-cms"></a>
  <a href="https://www.npmjs.com/package/decap-cms"><img alt="npm downloads" src="https://img.shields.io/npm/dm/decap-cms?logo=npm&color=cb3837"></a>
  <a href="https://github.com/decaporg/decap-cms/blob/main/LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
  <a href="https://github.com/decaporg/decap-cms/actions/workflows/nodejs.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/decaporg/decap-cms/nodejs.yml?branch=main&logo=github&label=CI"></a>
  <a href="https://app.netlify.com/sites/decap-www/deploys"><img alt="Netlify status" src="https://api.netlify.com/api/v1/badges/8b87160b-0a11-4f75-8050-1d21bc1cff8c/deploy-status"></a>
</p>

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white">
  <img alt="React 19" src="https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white">
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-9-f69220?logo=pnpm&logoColor=white">
  <img alt="Turborepo" src="https://img.shields.io/badge/Turborepo-2.x-EF4444?logo=turborepo&logoColor=white">
  <img alt="Vitest" src="https://img.shields.io/badge/tested%20with-Vitest-6e9f18?logo=vitest&logoColor=white">
  <a href="https://decapcms.org/chat"><img alt="Discord" src="https://img.shields.io/badge/chat-Discord-5865f2?logo=discord&logoColor=white"></a>
  <a href="https://github.com/decaporg/decap-cms/blob/main/CONTRIBUTING.md"><img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"></a>
</p>

<p align="center">
  <a href="https://www.decapcms.org/">Website</a> •
  <a href="https://www.decapcms.org/docs/">Documentation</a> •
  <a href="https://decapcms.org/chat">Community chat</a> •
  <a href="https://github.com/decaporg/decap-cms/releases">Releases</a>
</p>

> Decap CMS is the new name of Netlify CMS, [renamed in February 2023](https://www.netlify.com/blog/netlify-cms-to-become-decap-cms/).

## What it does

Decap CMS is a single‑page app that mounts under `/admin` on your site. It reads and writes content directly to a Git repository through your provider's API (GitHub, GitLab, Gitea, Bitbucket, Git Gateway, Azure DevOps), so editors get a friendly UI while engineers keep version control, code review, and existing build pipelines.

Read more in the [core concepts docs](https://www.decapcms.org/docs/intro/).

## Quick start

Two paths, depending on how much you want to control:

| Path | When to pick it | Docs |
| --- | --- | --- |
| **CDN install** — drop two HTML files into `/admin` | Fastest path. No build tooling on your site. | [Quick Start Guide](https://www.decapcms.org/docs/quick-start/) |
| **npm install** — bundle Decap into your app | More flexibility, custom widgets, custom styles. | [Custom installation](https://www.decapcms.org/docs/install-decap-cms/) |

## Repository layout

This is a [pnpm workspace](https://pnpm.io/workspaces) orchestrated by [Turborepo](https://turborepo.com). Every public artifact lives under `packages/`:

```
packages/
├── decap-cms                         # Bundled distribution (CDN target)
├── decap-cms-app                     # App entry that wires everything up
├── decap-cms-core                    # Editor UI, redux store, registry
├── decap-cms-backend-*               # GitHub, GitLab, Gitea, Bitbucket, Git Gateway, Azure, Proxy
├── decap-cms-widget-*                # Per-widget controls + previews (string, number, list, etc.)
├── decap-cms-editor-component-*      # Rich-text editor blocks
├── decap-cms-lib-*                   # Shared utilities, auth helpers
├── decap-cms-ui-default              # Design system / UI primitives
└── decap-cms-locales                 # i18n translations
```

Heading into the codebase? Start with `packages/decap-cms-core` for the editor, `packages/decap-cms-app` for the bootstrap.

## Development

Requires **Node 22+** and **pnpm 9+**.

```sh
git clone https://github.com/decaporg/decap-cms
cd decap-cms
pnpm install
pnpm start          # turbo --parallel develop, served at http://localhost:8080
```

Common scripts (from the workspace root):

| Script | Description |
| --- | --- |
| `pnpm start` / `pnpm develop` | Watch & rebuild every package; serves the dev test site. |
| `pnpm build` | Build all packages with `turbo run build`. |
| `pnpm test:unit` | Run the Vitest suite. |
| `pnpm test:e2e` | Build the demo site and run Cypress end‑to‑end tests. |
| `pnpm lint` | Run ESLint, Stylelint, and Prettier checks. |
| `pnpm format` | Apply ESLint `--fix` and Prettier `--write`. |
| `pnpm type-check` | `tsc --noEmit` across the workspace. |

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full workflow, including how to debug a specific backend.

## Sponsor

Decap CMS is a community project. Sponsorships fund maintenance, security work, and new features.

<p>
  <a href="https://github.com/sponsors/decaporg"><img alt="Sponsor on GitHub" src="https://img.shields.io/badge/Sponsor-GitHub-ea4aaa?style=for-the-badge&logo=github"></a>
  <a href="https://opencollective.com/decap"><img alt="Sponsor on Open Collective" src="https://img.shields.io/badge/Sponsor-Open%20Collective-1f87ff?style=for-the-badge&logo=opencollective&logoColor=white"></a>
</p>

![Open Collective backers](https://opencollective.com/decap/backers.svg?limit=30&button=false&avatarHeight=48&width=400)

<!-- sponsors --><a href="https://github.com/Zwyx"><img src="https://github.com/Zwyx.png" width="48px" alt="Zwyx" style="border-radius:50%" /></a> &nbsp;<a href="https://github.com/smolcodes"><img src="https://github.com/smolcodes.png" width="48px" alt="smolcodes" style="border-radius:50%" /></a> &nbsp;<a href="https://github.com/shizik"><img src="https://github.com/shizik.png" width="48px" alt="shizik" style="border-radius:50%" /></a> &nbsp;<a href="https://github.com/JacquesRaoult"><img src="https://github.com/JacquesRaoult.png" width="48px" alt="JacquesRaoult" style="border-radius:50%" /></a> &nbsp;<!-- sponsors -->

## Contributing

New contributors are always welcome — large or small. See [CONTRIBUTING.md](./CONTRIBUTING.md) and our [Code of Conduct](./CODE_OF_CONDUCT.md).

For documentation contributions, see the [website repo](https://github.com/decaporg/decap-website).

## Versioning & releases

This project follows [Semantic Versioning](https://semver.org/). Release notes live on the [GitHub Releases](https://github.com/decaporg/decap-cms/releases) page; the cumulative changelog is in [CHANGELOG.md](./CHANGELOG.md). Breaking changes for the current major are documented in [BREAKING_CHANGES.md](./BREAKING_CHANGES.md).

## Security

Found a vulnerability? Please report it through [GitHub Security Advisories](https://github.com/decaporg/decap-cms/security/advisories/new). Full policy in [SECURITY.md](./SECURITY.md).

## Maintainers

Maintained with care by [PM TechHub](https://techhub.p-m.si/) and friends. Need professional support, custom features, or onboarding? See [decapcms.org/services](https://decapcms.org/services/).

## License

[MIT](./LICENSE) — please understand its [implications and guarantees](https://writing.kemitchell.com/2016/09/21/MIT-License-Line-by-Line.html).
