---
"@laikacms/decap-cms": minor
---

Number widget: add a `slider: true` config option (DCMS-1424) that renders a native range slider
alongside the numeric input, respecting the existing `min`/`max`/`step` schema values (falling back
to a 0-100 range when `min`/`max` are unset). Both inputs share the same `onChange` handler and stay
in sync.
