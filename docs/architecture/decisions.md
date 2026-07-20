## Why a single package repo with seperate xport paths instead of a monorepo with seperate packages.

For the same exact reason AWS decided to put all their packages in one big package: Transitive
dependency drift. Transitive dependencies will cause problems in consumer packages. We had this
exact problem and decided that it would be far cleaner to use export paths.

## Why not replace @emotion/styled with X:

Because Decap's original emotion setup is actually pretty good. Even though its not used as much
nowadays, it doesnt force you to bundle it a certain way. Because emotion smartly interacts with
typescript's jsxImportSource propery, no additional bundling is needed. I found vanilla-extract has
a nice "zero-runtime" feature but is not ideal for libraries since it forces opiniated bundling. We
don't want to force users of Laika CMS to use a specific technology. Tailwind CSS: While I use it
for almost all of my apps, for a library, it's not the right tool for obvious reasons. CSS Modules:
The best candidate next to @emotion. It needs custom bundling but support is very good. It doesnt
provide the advantages that @emotion provides and a rewrite would take a considerable amount of
time.

## Why not use effect in decap-cms?:

There are very good reasonos to use effect but also a lot of reasonos to not use it for this
project:

- Learning curve: Unlike Laika Code, any dev should be able to easily look at, and change the
  decap-cms source code, and FP is not something all or even most dev's are acustomed with.
- Types: Effect relies on the Typescript compiler a lot. Decap-CMS's interfaces would leak these
  types (there are ways to not do this but it would kind of defeat the purpose of having Effect
  since) and small changes per version means that type errors when things feel like they should just
  work, happen. There are libraries that started of with effect but have had to completely remove it
  from their code because of these issues.
- Fit: We are dealing mostly with UI and state. The place where Effect-ts would shine the most is
  for CRUD. Which is mostly done by [laikacms](https://github.com/laikacms/laikacms) code, which
  already uses Effect-TS.
