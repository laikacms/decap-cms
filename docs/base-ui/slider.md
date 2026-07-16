# Slider

Status: proposed

Base UI's Slider (`@base-ui/react/slider`) is a full range-input replacement composed of `Root`
(value/defaultValue as number or array for multi-thumb ranges, `min`/`max`/`step`, `orientation`),
`Control`, `Track`, `Indicator`, `Thumb` (draggable, keyboard operable with arrow keys and
PageUp/Down `largeStep`), `Label`, and `Value`. It handles pointer math, thumb collision behavior,
form integration, and `aria-valuenow` semantics that a hand-rolled slider would otherwise have to
reimplement.

## Current state in this repo

There are zero imports of `@base-ui/react/slider` and zero slider-like controls in the running app:
no `<input type="range">` anywhere in `src/`, and the number widget (`src/widgets/number/`) is a
plain numeric text input by design.

The one slider-shaped surface is a stub awaiting a rebuild:

- `src/ui/editor/editor-ui/ColorPicker.tsx:1-5`: the header comment states the original color picker
  was "1938 lines of custom HSL picker UI" and this minimal version only preserves the export
  surface until "the real emotion-styled picker lands later".
- `ColorPickerHueSlider` (line 59) and `ColorPickerAlphaSlider` (line 62) currently `return null`;
  `ColorPickerArea`, `Swatch`, `EyeDropper`, and `FormatSelect` are also null stubs. The only
  working control is a native `<input type="color">` (`ColorPickerInput`, line 85).
- Consumers are the richtext toolbar's color plugins,
  `src/ui/editor/plugins/toolbar/FontColorToolbarPlugin.tsx` and
  `src/ui/editor/plugins/toolbar/FontBackgroundToolbarPlugin.tsx`, which compose these picker parts
  inside a popover.

## Proposed adoption

When the real color picker is rebuilt, implement `ColorPickerHueSlider` and `ColorPickerAlphaSlider`
on `Slider.Root/Control/Track/Indicator/Thumb`:

- Hue: `min={0} max={360} step={1}` over a fixed hue-gradient track; alpha: `min={0} max={100}` over
  a checkerboard-plus-gradient track. Both are single-thumb, horizontal, styled with Emotion like
  the other Base UI wrappers in `src/ui`.
- This replaces the largest chunk of the deleted 1938-line implementation (custom pointer tracking,
  clamping, keyboard handling, ARIA plumbing) with library behavior: arrow-key stepping, PageUp/Down
  large steps, `aria-valuenow`/`getAriaValueText` (for example "Hue 210 degrees"), and drag
  mechanics for free. Only the 2D saturation/value `Area` needs bespoke pointer code, since a slider
  is one-dimensional.

Why it is not done now, honestly: there is no slider in production code to swap; the adoption only
exists inside a full component rebuild that the stub explicitly defers ("the real emotion-styled
picker lands later"), including popover layout, swatches, format select, and eye-dropper. Doing that
rebuild as a side effect of a primitive evaluation would be a large, design-sensitive change. The
concrete plan is: when the ColorPicker rebuild is scheduled, make Base UI Slider a stated
requirement of that task instead of porting the old hand-rolled slider code.
