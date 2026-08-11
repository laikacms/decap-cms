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

Sites can ship one of two interfaces: the classic CMS shell described here, or the newer "Laika"
shell, which adds a dashboard landing page, keyboard shortcuts, and a layout that works on phones.
In the Laika shell, press <kbd>/</kbd> to open the search and command palette, and <kbd>?</kbd> to
see the full shortcut list. The content concepts below are the same in both; only the chrome around
them differs.

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

| Widget    | What it's for                                                                                                                                                                                                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| String    | A single line of plain text (e.g. a title).                                                                                                                                                                                                                                                |
| Text      | A multi-line plain-text box.                                                                                                                                                                                                                                                               |
| Rich Text | A WYSIWYG editor with a formatting toolbar (bold, italic, links, headings, lists, quotes, code). Saves to Markdown by default, and can be configured to save HTML or plain text instead. Sites written against older versions may still label this field "Markdown"; it's the same widget. |
| Number    | A field restricted to numeric input.                                                                                                                                                                                                                                                       |
| Boolean   | An on/off switch.                                                                                                                                                                                                                                                                          |
| Select    | A dropdown chosen from a fixed list of options.                                                                                                                                                                                                                                            |
| DateTime  | A date/time picker; can be set to the current date and time with one click.                                                                                                                                                                                                                |
| Image     | Upload an image or pick one from the media library.                                                                                                                                                                                                                                        |
| File      | Upload any file or pick one from the media library (shares the Image widget's picker).                                                                                                                                                                                                     |
| List      | A repeatable list of values or sub-fields (add/remove items).                                                                                                                                                                                                                              |
| Object    | A group of related fields nested together, optionally collapsible.                                                                                                                                                                                                                         |
| Relation  | Search for and link to an entry in another collection (e.g. picking an "Author" from an Authors collection).                                                                                                                                                                               |
| Map       | Draw a point, line, or polygon on a map.                                                                                                                                                                                                                                                   |
| Code      | A syntax-highlighted code editor.                                                                                                                                                                                                                                                          |
| Color     | A swatch that opens a color picker, plus a text input for the raw value.                                                                                                                                                                                                                   |
| UUID      | A generated unique id, filled in automatically the first time the field appears. Usually left alone.                                                                                                                                                                                       |

Some sites also enable optional widgets that aren't part of the default set - most commonly an
**icon picker** (browse and select an icon from an icon library) and an **AI chat** panel for
drafting content inside the editor. If you see a field that isn't in the table above, it's one of
these or a custom widget built for that site.

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
approved. Only entries with **Ready** status can be published.

Outside the entry editor, the **Editorial Workflow** view (usually reachable from the main
navigation) shows all in-progress entries as cards on a board with three columns - **Drafts**, **In
Review**, and **Ready** - and a summary count of how many entries are waiting for review versus
ready to go live. You can drag a card between columns to change its status, or work from inside the
entry editor. From a card (or the entry toolbar) you can:

- **Publish changes** / **Publish now** - go live immediately (only enabled once the entry is
  Ready).
- **Delete** the draft, the unpublished changes, or (for already-live entries) the published entry
  itself.
- **Unpublish** an already-live entry, taking it back out of the published site.

If you try to publish an entry that isn't marked Ready, or that has unsaved edits, you'll be
prompted to fix that first rather than losing anything silently.

## Using the media library

Any Image or File field opens the media library when you click it, and it's also reachable directly
if the site owner has added a media manager link to the UI.

- **Browse** - assets are shown as a grid of cards; an "Images" filter narrows results to image
  files when you're picking for an Image field.
- **Search** - use the search box to filter assets by name.
- **Upload** - click Upload and choose one or more files from your computer.
- **Insert into your entry** - select an asset and confirm ("Choose selected") to insert it into the
  field you opened the library from.
- **Copy a reference** - from an asset's card menu you can copy its URL, its repository path, or
  just its filename, useful when you need to reference the asset manually (for example, inside a
  Rich Text field instead of an Image field).
- **Delete** - select one or more assets and use "Delete selected" to remove them. This only removes
  the file from the media library; it won't automatically update entries that already reference it.
- **Private media** - some sites configure a separate, non-public media library (e.g. for
  downloadable files that shouldn't be publicly listed); if so you'll see it labeled "Private" and
  it's kept apart from the public media grid.

## Getting help

If a field, button, or workflow described here doesn't appear on your site, it's most likely
disabled or relabeled in that site's configuration - check with the person who set up the CMS. For
anything that looks like a bug rather than a configuration choice, report it on the
[issue tracker](https://github.com/laikacms/decap-cms/issues).
