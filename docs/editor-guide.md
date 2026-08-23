# Editor Guide

This page is for content editors using a site that already has the CMS installed - it doesn't cover
installation or `config.yml`. If something here doesn't match what you see, ask whoever set up the
CMS: field labels, available widgets, and whether an editorial workflow is enabled are all
controlled by that site's configuration.

## Signing in

Navigate to `/admin/` on the site. You'll be prompted to authenticate through the site's configured
git backend (GitHub, GitLab, Bitbucket, Gitea, Azure, etc.) or a custom login flow. Once signed in
you land on the collections list - the content types the site owner has made available to you (e.g.
"Blog Posts", "Pages").

## Writing and editing an entry

Open a collection to see its list of entries, then click an entry to edit it, or use the "New Post"
(or similarly labeled) button to create one. The editor shows your content fields on the left and,
where the site owner has enabled it, a live preview pane on the right.

- **Toggle preview** - hide or show the live preview pane.
- **Field outline** - a collapsible sidebar listing every field in the entry, useful for jumping
  around long entries.
- **Multiple languages (i18n)** - if the site is configured for multiple locales, a toggle lets you
  switch which locale you're editing; a "Fill in from another locale" action can copy content from
  one locale into the one you're currently editing (it overwrites whatever is already there, so use
  it before you've made changes you want to keep).

### Field types you'll encounter

The exact fields on each entry are chosen by whoever configured the site, but they're built from
this common set of controls:

| Widget    | What it's for                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| String    | A single line of plain text (e.g. a title).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Text      | A multi-line plain-text box.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Rich Text | A WYSIWYG editor with a formatting toolbar (bold, italic, links, headings, lists, quotes, code). Saves to Markdown by default. Saving HTML or plain text instead is possible, but only if whoever configured the site registered that format pack (see [`src/widgets/richtext/README.md`](../packages/decap-cms/src/widgets/richtext/README.md#format-packs)) — without that registration, saving a field set to one of those formats fails. Sites written against older versions may still label this field "Markdown"; it's the same widget. Custom **inline** blocks (chips embedded mid-sentence, e.g. a mention or inline embed) are a known limitation on the Markdown format: they save fine but are silently lost when the entry reloads — see [`src/widgets/richtext/README.md`](../packages/decap-cms/src/widgets/richtext/README.md#blockdefinition-shape). |
| Number    | A field restricted to numeric input.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Boolean   | An on/off switch.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Select    | A dropdown chosen from a fixed list of options.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| DateTime  | A date/time picker; can be set to the current date and time with one click.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Image     | Upload an image or pick one from the media library.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| File      | Upload any file or pick one from the media library (shares the Image widget's picker).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| List      | A repeatable list of values or sub-fields (add/remove items).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Object    | A group of related fields nested together, optionally collapsible.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Relation  | Search for and link to an entry in another collection (e.g. picking an "Author" from an Authors collection).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Code      | A syntax-highlighted code editor.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Color     | A swatch that opens a color picker, plus a text input for the raw value.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| UUID      | A generated unique id, filled in automatically the first time the field appears. Usually left alone.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

Some sites also enable optional widgets that aren't part of the default set - most commonly an
**icon picker** (browse and select an icon from an icon library), a **map** widget (draw a point,
line, or polygon on a map; requires the site to install the standalone `decap-cms-widget-map`
package and register it with `CMS.registerWidget(...)` before `CMS.init()` runs — see
[`extensions/widgets/map`](../extensions/widgets/map)), and an **AI chat** panel for drafting
content inside the editor. **The AI chat panel is deprecated** and being phased out in favor of an
external MCP server (`/mcp`); prefer the MCP integration for AI-assisted editing and use the
in-editor panel only if a site still has it enabled. If you see a field that isn't in the table
above, it's one of these or a custom widget built for that site.

## Saving, publishing, and the editorial workflow

How your changes go live depends on whether the site owner turned on the **editorial workflow**.

### Without editorial workflow (simple mode)

The toolbar shows **Save** and **Publish now**. Save stores your work; Publish now commits (or opens
a pull request for, depending on backend configuration) the change so it goes live. A "Delete entry"
action is also available. Unsaved changes are flagged in the toolbar so you don't lose work by
navigating away.

### With editorial workflow

Each entry carries a status: **Draft**, **In review**, or **Ready**. You move an entry through these
statuses using the status control in the entry toolbar (a tooltip explains what each status means) -
set it to "In review" once you're done drafting, and to "Ready" once it's been reviewed and
approved.

Outside the entry editor, the **Editorial Workflow** view (usually reachable from the main
navigation) shows all in-progress entries as cards on a board with three columns - **Drafts**, **In
Review**, and **Ready** - and a summary count of how many entries are waiting for review versus
ready to go live. You can drag a card between columns to change its status, or work from inside the
entry editor. From a card you can:

- **Publish changes** - go live immediately. On the board, this is only enabled once the card is
  Ready.
- **Delete** the draft, the unpublished changes, or (for already-live entries) the published entry
  itself.
- **Unpublish** an already-live entry, taking it back out of the published site.

Inside the entry editor itself, whether the **Publish now** button is gated by status depends on
which shell the site runs:

- Publish now is _not_ gated by status - it's available as soon as you have edit access, regardless
  of whether the entry is Draft, In review, or Ready, so double-check the status control before
  publishing if you want reviews to actually happen first.

Both shells enforce unsaved changes the same way: Publish now is hidden whenever you have edits that
haven't been saved yet, so save your work before publishing.

Once an entry is Ready and saved, the entry editor's publish menu also offers **Schedule publish** -
pick a future date and time and the entry publishes automatically once that time arrives, instead of
right away. A scheduled entry can be cancelled ("Cancel scheduled publish") from the same menu
before it fires. This is client-side only: there is no server-side cron behind it, so the entry
actually publishes the next time someone has the CMS open in a browser tab at or after the scheduled
time (checked on load and about once a minute while the Editorial Workflow board is open) - not
necessarily at the exact moment you picked. Don't rely on it for publishes that must go live to the
second with nobody watching. The scheduled time itself is stored in that browser's local storage
only, not synced anywhere - so the publish fires only when the _same browser_ (not a teammate's
browser or another device) has the CMS open at or after the scheduled time; if you schedule a
publish and then close the tab for good, ask a colleague to open the CMS in the same browser
profile, not just "any browser," to make sure it actually fires.

## Using the media library

Any Image or File field opens the media library when you click it, and it's also reachable directly
if the site owner has added a media manager link to the UI.

- **Browse** - assets are shown as a grid of cards; an "Images" filter narrows results to image
  files when you're picking for an Image field.
- **Search** - use the search box to filter assets by name.
- **Upload** - click Upload and choose one or more files from your computer.
- **Insert into your entry** - select an asset and confirm ("Choose selected") to insert it into the
  field you opened the library from.
- **Copy a reference** - select an asset and use the "Copy" button in the toolbar at the top of the
  media library to copy a reference to your clipboard, useful when you need to reference the asset
  manually (for example, inside a Rich Text field instead of an Image field). The button copies a
  single value that it picks for you automatically, not a choice you make: the asset's URL if it
  resolves to an absolute URL, otherwise its filename if you're editing an unsaved draft entry,
  otherwise its repository path.
- **Delete** - select one or more assets and use "Delete selected" to remove them. This only removes
  the file from the media library; it won't automatically update entries that already reference it.
- **Private media** - some sites configure a separate, non-public media library (e.g. for
  downloadable files that shouldn't be publicly listed); if so you'll see it labeled "Private" and
  it's kept apart from the public media grid.

## Getting help

If a field, button, or workflow described here doesn't appear on your site, it's most likely
disabled or relabeled in that site's configuration - check with the person who set up the CMS. For
anything that looks like a bug rather than a configuration choice, report it on the
[issue tracker](https://github.com/decaporg/decap-cms/issues).
