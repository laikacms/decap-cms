![Decap CMS](/.github/decap.svg)

# @laikacms/decap-cms

[![npm version](https://img.shields.io/npm/v/@laikacms/decap-cms.svg?style=flat)](https://www.npmjs.com/package/@laikacms/decap-cms) [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/laikacms/decap-cms/blob/main/LICENSE) [![Build Status](https://github.com/laikacms/decap-cms/workflows/Node%20CI/badge.svg)](https://github.com/laikacms/decap-cms/actions?query=workflow%3A%22Node+CI%22)

A single-package fork of [Decap CMS](https://decapcms.org/), the open-source, Git-based CMS for
static site generators. It presents a clean UI for editing content stored in a Git repository:
you describe your content model in a YAML config, drop the CMS into the `/admin` part of your
site, and editors work against your repo through their browser.

This fork exists to keep that idea moving. All credit for the concept, the architecture, and a
decade of groundwork goes to the Decap CMS team; see [Credits](#credits) below.

## What is different from upstream

- **One package instead of a monorepo.** The former `decap-cms-*` packages live in a single
  `@laikacms/decap-cms` package. Each former package is exposed as a subpath export (see
  `package.json#exports`); the root export is the classic app bootstrap.
- **The Laika UI.** Alongside the classic Decap app shell there is a new shell with a dashboard,
  command palette, and mobile support.
- **A modernized stack.** Base UI primitives for interactive behavior, Emotion for styling,
  Vitest and Playwright for testing, plain objects instead of Immutable.js, and an ongoing
  dependency-reduction effort.
- **Richtext on Portable Text.** The `markdown` widget is replaced by a `richtext` widget backed
  by the Portable Text editor. See `BREAKING_CHANGES_V2_BETA.md` for the full list of breaking
  changes.

## Installation

```sh
npm install @laikacms/decap-cms
```

The root export bootstraps the classic app. Individual parts (backends, widgets, the core
engine, UI primitives) are importable through subpath exports so you can assemble your own
build.

For configuration, content modeling, and backend setup, the upstream
[Decap CMS documentation](https://www.decapcms.org/docs/intro/) applies to this fork unless
noted in `BREAKING_CHANGES_V2_BETA.md`.

## Development

```sh
pnpm install        # Node >= 20, pnpm 9
pnpm test:ci        # lint + typecheck + unit tests
pnpm build:demo && pnpm serve:dev-test   # demo app on http://localhost:5174
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.

## Credits

This project is a fork of [Decap CMS](https://github.com/decaporg/decap-cms), created as
Netlify CMS by [Netlify](https://www.netlify.com/) and renamed
[in February 2023](https://www.netlify.com/blog/netlify-cms-to-become-decap-cms/). Decap CMS is
maintained with care by [PM TechHub](https://techhub.p-m.si/) and friends; if you want to
support the original project, visit [decapcms.org](https://decapcms.org/).

Everything here builds on their work, and the Decap maintainers are welcome to adopt any part
of this fork upstream.

## Change log

This project adheres to [Semantic Versioning](http://semver.org/). Every release is documented
on the GitHub [Releases](https://github.com/laikacms/decap-cms/releases) page.

## License

Released under the [MIT License](LICENSE), retaining the original Netlify copyright.
