# Reliance Builder

An AI-assisted prototype: type what you want to build, and it generates a Reliance-branded
visual first draft — website, app screen, slide, social asset, or motion concept — using
Reliance's real design tokens and components from `oneui.brands.json`, with Claude as the
reasoning layer that interprets the prompt and authors the content/layout.

## Skill check (run before this feature was built)

Per the project requirements, these were checked in this environment before implementation:

| Skill | Status | Notes |
|---|---|---|
| **UI/UX Pro Max** (`ui-ux-pro-max`) | ✅ Installed | Available as a Claude Code skill in this environment; used while designing the preview renderers (contrast, touch targets, spacing, hierarchy). |
| **Google Stitch skills / Stitch MCP** | ❌ Not installed | No Stitch skill is registered and no Stitch MCP server is configured in this environment. See below for setup. |

### Setting up Stitch (optional, not required to run the app)

The app works fully without Stitch — it's prepared for, not blocking on, Stitch integration.
To add it later:

1. Clone the skill source: https://github.com/google-labs-code/stitch-skills
2. Follow that repo's install instructions to register it as a Claude Code skill (or MCP
   server, if it exposes one) in `~/.claude/skills/` or your project's `.claude/` config.
3. Also see https://github.com/nextlevelbuilder/ui-ux-pro-max-skill for the UI/UX Pro Max
   skill's own setup docs if it's ever missing in a different environment — in *this*
   environment it's already installed.
4. Once a Stitch MCP server is configured, `App/aiServerPlugin.ts` is the place to add a
   second code path (e.g. a `type: 'stitch-design'` request) that hands off to Stitch for
   design generation instead of (or alongside) the Claude Messages call. Nothing else in
   the app needs to change — `App/src/ai/client.ts` already treats the AI layer as a single
   swappable boundary.

## Running it

```bash
npm install
npm run app:dev
```

Open the printed local URL (usually http://localhost:5173 or the next free port).

### Enabling live Claude generation

The app works out of the box **without** an API key — it falls back to a deterministic,
rule-based content generator (`App/src/ai/fallbackPlan.ts`) so the guided flow and preview
always render something. To get real Claude-authored previews:

1. Get an Anthropic API key: https://console.anthropic.com/
2. Add `ANTHROPIC_API_KEY=sk-ant-...` to the repo-root `.env` (create the file if it
   doesn't exist yet — it's already excluded via `.gitignore`).

   Optional model overrides (both read from the repo-root `.env`):

   - `ANTHROPIC_MODEL` — primary orchestration model. Default: `claude-fable-5`.
   - `ANTHROPIC_FALLBACK_MODEL` — retried once automatically when the primary model
     fails for any reason. Default: `claude-sonnet-5`.
3. Restart `npm run app:dev`

The key is **only** read by a local dev-server proxy (`App/aiServerPlugin.ts`) — it is never
sent to the browser or included in the client bundle. This proxy only exists under
`vite dev`; a real deployment of this prototype would need an equivalent hosted endpoint
(e.g. a serverless function) — out of scope for this local prototype.

## How it works

- **Brand source of truth**: `oneui.brands.json` — this app deliberately loads *only* the
  `reliance` entry from it, even though the file may list other brands. See
  `App/src/data/brandsConfig.ts` and `App/vite.config.ts`.
- **Reliance tokens & components**: real, shipped `@jds4/oneui-react` data — never invented.
  See `App/src/data/oneuiRegistry.ts`, `tokenRecommendations.ts`, and
  `relianceBrandMeta.ts` (which knows exactly which CSS custom properties Reliance's own
  brand CSS defines vs. falls back to the shared foundation for).
- **AI reasoning layer**: `App/src/ai/` — a two-phase flow. Phase 1 classifies the prompt
  into an output category and proposes follow-up questions; phase 2 authors the actual
  headline/copy/structure for the preview. Claude never chooses colors, fonts, spacing, or
  component styling directly — those always come from Reliance's real tokens, applied after
  the fact by the renderers in `App/src/components/previews/`.
- **Preview-first UI**: the rendered preview is the main result. Components, tokens, AI
  reasoning, and fallback notes only appear in the collapsed "Build details" panel
  (`App/src/components/BuildDetails.tsx`).
- **Dimensions**: `App/src/data/previewDimensions.ts` defines the real pixel canvas size for
  each format/variant (e.g. website desktop = 1440px, app screen mobile = 390×844,
  slides = 1920×1080). `App/src/components/PreviewFrame.tsx` renders content at that true
  size and scales it down to fit the panel, so what you see is proportionally accurate.

## Other tools in this repo

- `npm run storybook` — a full component catalog covering all three brands in
  `oneui.brands.json` (Jio/Reliance/Swadesh), for browsing the design system itself. Unlike
  the Reliance Builder app, this one *does* expose brand switching — that's its purpose.
