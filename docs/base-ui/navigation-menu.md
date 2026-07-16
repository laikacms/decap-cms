# Navigation Menu

Status: rejected

Base UI's Navigation Menu (`@base-ui/react/navigation-menu`) is a website-navigation component: a
`<nav>` with a `List` of `Item`s whose `Trigger`s open rich link panels (`Content` inside
`Portal`/`Positioner`/`Popup`/`Viewport`, with animated resizing between panels), the classic
hover/click mega-menu. Links are `NavigationMenu.Link` and compose with a router's Link component
via the `render` prop. Its value is the positioning, hover-intent delays (`delay`/`closeDelay`),
viewport animation, and menu-of-links ARIA semantics.

## Current state in this repo

There are zero imports of `@base-ui/react/navigation-menu`. The app's navigation surfaces are all
flat, persistent link lists, not hover-revealed panels:

- Classic shell header: `src/app/components/Header.tsx:7,122` renders collection links as `NavLink`
  from the custom router (`@/core/routing/Link`), styled as buttons in a static row. The custom
  router lives in `src/core/routing/` (registry, table, navigation).
- Laika header: `src/laika-app/LaikaHeader.tsx:146,332` uses styled `react-router-dom` `NavLink`s
  (workflow, media) in a static row.
- Laika sidebar: `src/laika-app/LaikaSidebar.tsx` is a persistent rail of collection `NavLink`s; at
  the mobile breakpoint it already uses Base UI's Drawer (`@base-ui/react/drawer`, line 5) for focus
  trapping and swipe-dismiss.
- The dropdowns that do exist in headers are action menus, not link panels: the settings avatar menu
  (`src/core/components/UI/SettingsDropdown.tsx`) and quick-add menus are built on the Base UI
  Menu-based `DropdownMenu`/`Dropdown` (`src/ui/DropdownMenu.tsx`, `src/ui/default/Dropdown.tsx`),
  which is the correct pattern for command menus.

## Why not adopt

Navigation Menu solves a problem this app does not have. A CMS admin shell wants its primary
navigation always visible (sidebar/header links) so authors can see where they are; there is no
marketing-style top bar where categories expand into panels of links on hover. Retrofitting it would
either bury the collection list behind hover triggers (a UX regression on desktop and unusable on
touch, where the Drawer already handles the mobile case) or reduce the component to rendering plain
links, using none of its machinery.

The custom router is not the blocker: `NavigationMenu.Link render={<NavLink .../>}` would compose
fine. There is simply no mega-menu use case. If one ever appears (for example a "Sites" switcher
panel with grouped links in a multi-site Laika dashboard), Navigation Menu is the right primitive;
until then the existing Menu-based dropdowns and NavLink rows carry correct semantics with less
code.
