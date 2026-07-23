---
"@laikacms/decap-cms": patch
---

Media library modal: made the card grid, search box, and close-button/title layout responsive at
small viewport widths — cards fill their grid cell instead of a fixed 280px width, the search input
shrinks instead of overflowing at a fixed 400px, and the close button sits inline with the title
below 500px instead of being clipped off-screen by its -40px offset (DCMS-1051, ports upstream
3c3fd819f / decaporg#7820).
