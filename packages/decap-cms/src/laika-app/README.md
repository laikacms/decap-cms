# laika-app

The Laika UI shell for Decap CMS v4.beta: dashboard, command palette, mobile layout, the
Laika-styled chrome (`LaikaHeader`, `LaikaSidebar`, `LaikaFooter`), and the reusable UI primitives
in `ui/` (`LaikaButton`, `LaikaIconButton`, `LaikaDialog`, ...). The classic Decap app shell lives
in `src/app/`; this folder is the new shell layered on top of the same core.

## Credits

The visual design and many of the component patterns in this folder are derived from the work of
**Daniel Mendes** ([@Daniel-Mendes](https://github.com/Daniel-Mendes)):

- The upstream Decap CMS UI redesign in
  [decaporg/decap-cms#7101](https://github.com/decaporg/decap-cms/pull/7101) (new layout, dark
  mode, responsive mobile design), authored by Daniel with contributions from Martin Jagodic
  ([@martinjagodic](https://github.com/martinjagodic)).
- His `decap-cms-ui-next` design system, which the primitives in `ui/` re-implement inside
  laika-app. For example, `LaikaButton` mirrors its Button, `LaikaHeader` its AppBar, and
  `LaikaSidebar` its NavMenu.

The Laika components are re-implementations rather than copies (Emotion styling on Base UI
primitives, wired to this fork's core), but the look, interaction patterns, and component
vocabulary come from Daniel's redesign. If you extend this folder, keep this attribution intact
and add a note when you port further pieces of his work.

Decap CMS, including the redesign contributed in PR #7101, is MIT licensed; see `LICENSE` at the
repository root.
