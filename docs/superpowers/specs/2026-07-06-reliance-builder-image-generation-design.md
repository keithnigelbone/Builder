# Reliance Builder: Nano Banana (Gemini) image generation

## Problem

Reliance Builder generates text/copy and picks real design-system components for a
preview, but never produces an actual image — every preview is pure layout. A new
reference document, `Conversation/ART_DIRECTION_RELIANCE_v4.md`, defines a detailed
visual language ("Grounded Confidence" applied to photography: brand-expression lenses,
framing/light/colour rules, a mandatory closing "visual baseline," banned words, and a
hard rule never to reference TATA Group's brand identity). The goal is to generate a
real, on-brand hero image for every build, using Google's Gemini image model (nicknamed
"Nano Banana" — confirmed via a working Python example using `gemini-3.1-flash-image`,
not the placeholder `nanobanana.ai` REST endpoint that was previously, incorrectly,
sitting in `.env`).

## Goal

Every build (all 5 categories: website, app-screens, slides, social-media, motion)
automatically gets a generated hero image, art-directed per the reference document, with
no manual "generate image" step. The video-generation project (Higgsfield) is separate
and out of scope here.

## Non-goals

- Higgsfield/video generation — a separate follow-on project.
- No changes to the `classify` Claude call or `CLASSIFY_TOOL` schema — only the `plan`
  call authors image-prompt fields.
- No "regenerate image" UI or image editing — one image is generated per plan, same
  lifecycle as the rest of the plan's content.
- No image persistence/caching backend — the generated image lives only in browser
  memory for the current session, same as the rest of this local dev prototype.
- No production/hosted-deployment concerns for the new proxy endpoint — same constraint
  `aiServerPlugin.ts` already documents (dev-only, via the Vite dev server).

## Design

### 1. Schema: `App/src/ai/schema.ts`

Add to `BuildPlan`:

```ts
imageSubject?: string;
imageAction?: string;
imageLocation?: string;
imageFraming?: string;
imageIsAerial?: boolean;
imageColourNotes?: string;
```

Claude authors only `imageSubject`/`imageAction`/`imageLocation`/`imageFraming` (the
"four parts" the art-direction doc requires, in that order) plus `imageIsAerial` (true
only for a genuinely top-down/aerial shot) and `imageColourNotes` (only meaningful when
`imageIsAerial` is true — fills the aerial baseline's scene-specific colour slot, e.g.
"steel blue and red-brown earth"). Claude never authors the visual baseline text itself.

### 2. `App/aiServerPlugin.ts` changes

- `PLAN_TOOL.input_schema.properties` gains the six fields above (all optional except
  none — `imageIsAerial` defaults false, `imageColourNotes` only required when aerial).
- `RELIANCE_SYSTEM_PROMPT` is only used by both `classify` and `plan` today. Since
  art-direction only applies to authored image-prompt fields (which only `plan`
  produces), the `plan` call's system prompt becomes
  `RELIANCE_SYSTEM_PROMPT + '\n\n' + RELIANCE_ART_DIRECTION` while `classify` keeps
  using `RELIANCE_SYSTEM_PROMPT` alone. This means `callAnthropic`'s call sites in the
  `/api/claude` handler pass different system strings per request `type` rather than
  one shared constant for both — a small, explicit branch in the existing handler function, not a new abstraction.

### 3. New module: `App/src/ai/artDirection.ts`

Three exports, mirroring `brandVoice.ts`'s pattern:

```ts
export const RELIANCE_ART_DIRECTION = `
Image direction: Grounded Confidence. Every generated image expresses at least one of
three lenses — ideally all three: Authority & Respect (sharp geometric framing, precise
directional light, the subject has presence and mass); Scalability & Growth (the
environment implies scale beyond the frame — a worker against a vast solar field, a
single car that implies a city — the subject is never isolated); Care (hands doing
something real, location made specific, nothing decorative).

Apply the 7 principles: show people operating with real consequence (We Care); show the
moment value is delivered, visible not implied (Customer Value); sharp and considered,
never generic (Excellence); no hierarchy when multiple people appear (One Team); the
individual's work connects to something larger, the person is never small (Ownership
Mindset); every subject shot with the same precision regardless of role — eye level or
slight low angle, never looking down (Respect); never staged, never stock, real skin
tones and real light (Integrity).

Three rules that never break: (1) light always has a direction — sun low, one side,
long rich shadows, nothing flat; (2) the subject is bright with shadow detail
preserved — never crushed to black, never overexposed; (3) bokeh background depth with
intimate push-in framing — something soft anchors the foreground, the background
separates but does not disappear.

Framing: for people, medium close-up with a slight low angle, both hands doing
something specific (operating, tending, turning, connecting — never resting), subject
offset in frame, a soft out-of-focus foreground element. For machines/infrastructure/
aerials, true top-down or wide low angle (never tilted), wide enough to show scale,
light still rakes from one side even from above. Never: subject smiling at camera
unless explicitly asked, centred symmetrical composition, tilted aerial, empty
foreground with no anchor.

Location must be named with physical, specific detail (e.g. "red-brown Rajasthan
earth, dry scrubland, neem trees" — never "in India" or "typical Indian setting", which
the reader must treat as producing nothing usable). Never write "hundreds" or
"thousands" in an aerial shot — name a real number or describe infrastructure extending
to the horizon.

Never use: "dramatic lighting", "beautiful", "professional photography", "realistic",
"stunning", "perfect", "amazing", "high quality", "photorealistic" alone, "in India",
"Indian setting", "typical".

Absolute rule, no exceptions: never reference, name, imply, or visually include
anything associated with TATA Group — not the name, not a wordmark, not a
TATA-branded vehicle or product, not any logo or colour mark associated with TATA
Motors, TATA Power, TATA Steel, TCS, Jaguar Land Rover, or any TATA subsidiary.
Describe all vehicles/products/infrastructure generically: "white electric car", not a
brand name; "passenger vehicle", not a marque; "steel structure", not a manufacturer.

Author imageSubject (physical description + clothing), imageAction (both hands doing
something specific), imageLocation (named Indian place with physical detail), and
imageFraming (shot type and angle) as separate fields — do not include the visual
baseline in any of them, it is appended separately. Set imageIsAerial true only for a
genuine top-down/aerial shot, and when true, set imageColourNotes to the scene's
specific colours (e.g. "steel-blue panels and red-brown earth").
`.trim();

export const RELIANCE_VISUAL_BASELINE =
  'eye level shot, warm golden directional light, bright on subject with rich shadow ' +
  'detail preserved, high colour saturation, bokeh background depth, intimate push-in ' +
  'framing, mid-to-high brightness, authentic Indian skin tones, vivid festive or ' +
  'natural colours, no artificial fill, cinematic documentary feel';

export const RELIANCE_VISUAL_BASELINE_AERIAL =
  'true top-down aerial perspective, warm golden directional light raking across ' +
  'surfaces, high colour saturation, vivid {{colourNotes}} colours, mid-to-high ' +
  'brightness, no artificial fill, cinematic documentary feel';
```

### 4. New file: `App/geminiImageProxy.ts`

A Vite dev-server plugin, structurally parallel to `aiServerPlugin.ts`'s
`claudeApiProxy()`: registers `server.middlewares.use('/api/gemini-image', ...)`,
reads `GEMINI_API_KEY`/`GEMINI_IMAGE_MODEL` from `process.env`, and on a missing key
returns a `503` the client already treats as "no image" (mirroring the existing Claude
proxy's missing-key behavior). On a POST body `{ prompt: string }`, calls Gemini's
`generateContent` REST endpoint via `fetch` (no new npm dependency — matching this
repo's existing minimal-deps convention and the same raw-`fetch` pattern
`callAnthropic` already uses) requesting image output, and returns
`{ result: { dataUrl: string } }` (a `data:image/png;base64,...` URL) on success, or
`{ error: string }` on failure — the client treats any error response as "no image,"
never as a thrown exception.

`App/vite.config.ts` registers this new plugin alongside `claudeApiProxy()`, and copies
`GEMINI_API_KEY`/`GEMINI_IMAGE_MODEL` from `loadEnv`'s result onto `process.env`, the
same way `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL` are copied today.

### 5. Client wiring: `App/src/ai/client.ts`

After a `plan` call resolves (from Claude or the fallback), assemble the final image
prompt as four newline-joined parts plus the baseline:

```
{imageSubject}
{imageAction}
{imageLocation}
{imageFraming}
{baseline}
```

where `{baseline}` is `RELIANCE_VISUAL_BASELINE`, or `RELIANCE_VISUAL_BASELINE_AERIAL`
with `{{colourNotes}}` replaced by `imageColourNotes` (falling back to the word
"natural" if empty) when `imageIsAerial` is true. Then POST to `/api/gemini-image` with
`{ prompt }`. If any of the four Claude-authored fields is missing (e.g. the
deterministic fallback plan was used, which doesn't author image fields — see
Non-goals: `fallbackPlan.ts` isn't touched by this spec, so it never populates these
six fields), skip the image call entirely rather than sending a partial/malformed
prompt.

### 6. Preview integration

Each of the 5 preview components (`WebsitePreview`, `AppScreenPreview`,
`SlidePreview`, `SocialPreview`, `MotionPreview` in
`App/src/components/previews/`) gains an optional `heroImage?: string` prop (a data
URL), rendered as an `<img>` in a layout-appropriate spot (e.g. website hero
background, social post's image area, slide's visual area). Absent while the image call
is in flight or if it failed — the existing text/component layout renders unaffected
either way, matching the existing fallback-tolerant pattern used for the rest of the
plan's content.

## Testing

No automated test suite exists in this project. Verification is manual: submit a build
prompt through the running dev app (with `GEMINI_API_KEY` set), confirm `/api/claude`'s
plan response includes the six new fields, confirm `/api/gemini-image` returns a real
`dataUrl` (not a 503/502), and visually confirm the rendered image appears in the
preview and roughly matches the art-direction rules (named location, directional
light, no TATA references).
