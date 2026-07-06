# JDS4 OneUI Component Review — Design

## Purpose

Provide a simple, local, interactive way to browse and inspect every component in
`@jds4/oneui-react` (v0.1.0-alpha.10), whose install tarballs live in
`/Users/keithbone/Downloads/jds4-packages-0.1.0-alpha.10`. There is no existing project
that consumes this design system locally — this is a standalone review tool, not a
production app.

## Source material

- Tarballs at `/Users/keithbone/Downloads/jds4-packages-0.1.0-alpha.10/*.tgz`:
  `jds4-oneui-react`, `jds4-oneui-icons-jio`, plus bundler plugins
  (`esbuild`, `next`, `vite`, `webpack`) and `jds4-oneui-init`, none of which are needed here.
- `@jds4/oneui-react` ships 39 components (see `dist/registry/releasedComponents.mjs`):
  Avatar, Badge, BottomNavigation, Button, Checkbox, CheckboxField, Chip, ChipGroup,
  CircularProgressIndicator, Container, CounterBadge, Divider, Icon, IconButton,
  IconContained, Image, IndicatorBadge, Input, InputField, Logo, Modal, Pagination,
  PaginationDots, Radio, RadioField, SelectableButton, SelectableIconButton,
  SelectableSingleTextButton, SingleTextButton, Slider, Stepper, Switch, Tabs, Text,
  Tooltip, TouchSlider, plus infra components `BrandProvider` and `Surface`.
- Only compiled output (`dist/**/*.mjs|.cjs|.d.ts`) is available — no component source —
  so Storybook's automatic prop-controls inference (react-docgen-typescript) won't work.
  Controls must be hand-written per component from the `.d.ts` signatures.
- The library bakes in a snapshot of the "jio" brand CSS and works without any bundler
  plugin or `oneui.brands.json` config. Since `@jds4/oneui-icons-jio` is the only icon
  set tarball available, the review app targets the Jio brand only.

## Approach

Storybook (`@storybook/react-vite`) as a standalone project at `/Users/keithbone/component_test`.

### Dependencies

- `@jds4/oneui-react` and `@jds4/oneui-icons-jio` installed via npm's `file:` protocol
  pointing directly at the `.tgz` files in the Downloads folder (the private Azure DevOps
  feed these packages normally come from isn't configured, and isn't needed for local
  tarball installs).
- `react`, `react-dom`, and the library's own dependencies (`@base-ui/react`, `clsx`,
  `embla-carousel`, `embla-carousel-autoplay`, `embla-carousel-react`) install normally
  from the public npm registry.
- `storybook` + `@storybook/react-vite` as dev dependencies.
- No `@jds4/oneui-vite-plugin` — not needed for the baked-in Jio snapshot.

### Global setup

- `.storybook/preview.tsx` imports `@jds4/oneui-react/styles` once and wraps every story
  in `<BrandProvider brand="jio">` via a global decorator.
- Stories authored in TypeScript (`.tsx`) to match the library's shipped types.

### Story structure

One `src/stories/<ComponentName>.stories.tsx` per component, grouped under a flat
`Components/*` Storybook title.

**Tier 1 — full interactive controls** (hand-written `argTypes` reflecting each
component's real prop types, read from its `.d.ts`): Button, Input, InputField,
Checkbox, CheckboxField, Radio, RadioField, Switch, Chip, Tabs, Modal, Badge, Slider,
Stepper, Avatar, Tooltip, SelectableButton.

**Tier 2 — single default-render story, no custom controls**: BottomNavigation,
ChipGroup, CircularProgressIndicator, Container, CounterBadge, Divider, Icon,
IconButton, IconContained, Image, IndicatorBadge, Logo, Pagination, PaginationDots,
SelectableIconButton, SelectableSingleTextButton, SingleTextButton, TouchSlider,
Surface, Text.

`BrandProvider` is excluded from the gallery — it's applied globally via the decorator,
not something to browse standalone.

## Verification

After scaffolding, run `npm run storybook` (default port 6006) and manually check:

- A couple of Tier 1 stories: controls actually re-render the component live.
- A couple of Tier 2 stories: component mounts with no console errors.
- The Icon and Avatar stories specifically: the Jio icon set resolves correctly through
  the baked-in brand snapshot (no plugin/brand config present).

## Out of scope

- Other brands (only the Jio icon tarball is available).
- The bundler plugins (`esbuild`/`next`/`vite`/`webpack`) and `oneui-init` — not needed
  for a static local review tool.
- Automated tests / CI — this is a manual review tool, not shipped code.
- Non-Jio icon sets (lucide, tabler, phosphor, remixicon) — all optional peer deps, unused here.
