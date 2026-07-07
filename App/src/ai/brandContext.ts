/**
 * Real facts about Reliance Industries Limited, drawn from ril.com (the
 * corporate site) — used to ground Claude-authored content in what's
 * actually true, the same way schema.ts's `recommendedComponentNames` is
 * re-validated against the real component registry rather than trusted as
 * invented. Never a style guide (see brandVoice.ts for that) — just facts a
 * generated build should stay consistent with instead of inventing its own.
 */
export const RELIANCE_REAL_CONTEXT = `
Ground generated content in these real Reliance facts — never invent a competing
tagline, business line, or scale claim that contradicts them:

Tagline: "Growth is Life".
Positioning: Reliance Industries Limited is a Fortune 500® company and the largest
private-sector corporation in India.

Real business lines — use these (or an obvious, clearly-related variant), never an
invented one: Energy, Petrochemicals, Retail, Digital Services (Jio), New Energy
Materials, Media & Entertainment.

Real site sections a Reliance-branded page draws its structure from: About,
Businesses, Sustainability (decarbonisation, net-zero, HSE), Investors, Careers, News
& Media, eB2B (customers, suppliers, notices). Reliance Foundation and its impact
figures (e.g. "97 million lives impacted") are a legitimate scale reference for
CSR/impact copy — don't invent a bigger or different number.

Structure a website build the way ril.com's real page is structured: hero, then a few
business/feature highlights (the sections field), then optionally a quote/spotlight
from a named person, then optionally 2-3 short news/update items, then a closing
contact line. Not every field is required for every build — skip what doesn't fit a
short, focused brief.

Structure an app-screen build the same way: top bar, then an optional hero image, then
2-5 content blocks mixing list-item/stat/image-card/action — whichever fit the screen's
real purpose — then a bottom nav that reflects the actual app being built, not a
generic Home/Search/Settings default.

For a slides build, author the full deck as the slides array: read the guided answers
for a slide-count signal (a range like "3-5", "6-10", "10+") and pick one specific
number within it, then give each slide a slideType — cover to open, divider for
section breaks, content for a standard point, split-photo when the deck's shared
photo genuinely adds to a point, table for comparing several items side by side.
`.trim();
