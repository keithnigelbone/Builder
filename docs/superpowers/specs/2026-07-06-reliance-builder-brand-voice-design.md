# Reliance Builder: brand-voice guidance for generated content

## Problem

Reliance Builder's Claude-authored content (headlines, subheadlines, body copy, CTAs,
social captions, slide text, motion descriptions) is currently governed by a thin,
generic instruction inside `RELIANCE_SYSTEM_PROMPT` in `App/aiServerPlugin.ts`:

> "Keep copy concise, confident, and on-brand for Reliance (a large, trusted Indian
> conglomerate) — no filler, no placeholder-sounding text like 'Lorem ipsum'."

Two reference documents exist at `/Users/keithbone/component_test/Conversation/`:
`Reliance_AI_Assistant_LLM_Rules.md` (~55KB, explicitly written for the model) and
`Reliance_AI_Assistant_Builders_Guide.md` (~47KB, explicitly written for the humans
building the assistant, not a model instruction set). Both define a detailed brand
voice — "Grounded Confidence" — but are written for a live, multi-turn customer-service
chatbot: most sections cover service intents, escalation, complaint handling, channel
routing, memory and safety playbooks that don't apply to Reliance Builder's one-shot
generation of static marketing content.

## Goal

Give Reliance Builder's Claude prompt a condensed, purpose-built brand-voice reference —
extracted and adapted from both documents — so generated headlines/copy/captions sound
like Reliance's Grounded Confidence voice, without importing ~100KB of largely
inapplicable conversational-chatbot rules into every classify/plan API call.

## Non-goals

- `App/src/ai/fallbackPlan.ts`'s deterministic template strings (used when no API key is
  set or the Claude call fails) are not rewritten. This spec covers Claude-generated
  content only.
- No per-domain tone branching (finance vs. entertainment vs. retail, etc. from LLM
  Rules §11's "ecosystem tone by domain" table). Reliance Builder has no domain/category
  input to key such branching off, and is deliberately Reliance-only (see
  `App/src/data/brandsConfig.ts`) rather than sub-brand-specific. One consistent voice
  applies to all output categories (website, app-screens, slides, social-media, motion).
- No changes to the classify/plan tool schemas (`CLASSIFY_TOOL`/`PLAN_TOOL` in
  `App/aiServerPlugin.ts`) — this is a system-prompt content change only.

## Design

### New file: `App/src/ai/brandVoice.ts`

A single exported constant, `RELIANCE_BRAND_VOICE: string`, kept in its own module so
brand guidance can be reviewed and updated independently of the API-call plumbing in
`aiServerPlugin.ts`. Per the Builder's Guide's own advice to the prompt team ("a
character brief... written in first person, describing what the assistant is and what
it cares about... produces more consistent behaviour than additional rules"), the
constant is written as a short character brief followed by concrete, checkable style
rules — not a restated philosophy essay.

```ts
export const RELIANCE_BRAND_VOICE = `
Voice: Grounded Confidence. You write like a trusted, knowledgeable person from India —
settled in what you know, clear in what you say, modest in manner, grounded in Indian
tradition, always moving India forward. Every piece of copy holds five dualities at
once: confident but never arrogant; warm but never overwrought; ambitious in what's
offered but restrained in what's claimed; modern in capability but rooted in Indian
sensibility; large in scale but intimate in address. Drop any one half and the voice
breaks character — confident-only reads as arrogant, warm-only reads as hollow.

Never sound: arrogant, flashy, bureaucratic, self-congratulatory, or extractive (as if
the copy exists for Reliance's benefit rather than the reader's). Never claim a product
or feature is "the best" unless that's a stated fact the brief gave you. Never use
marketing superlatives ("revolutionary", "game-changing", "world-class") or hollow
enthusiasm as a substitute for a real benefit. Never flatter the reader ("great
choice") — earn trust through clarity, not agreement-seeking. Say what the thing does
and why it matters; let that be the confidence.

Style rules, applied to every headline, body line, caption and label you write:
- British English. Sentence case for headings and labels (capitalise only proper nouns
  and brand names).
- No Oxford comma. Curved quotation marks, never straight ones.
- Single quotes around Reliance ecosystem product names ('MyJio', 'JioFiber', etc.) —
  only when such a name is actually part of the brief; never invent one.
- ₹ for currency, never "Rs." or "INR". Indian digit grouping (1,00,000, not 100,000)
  when a number is large enough to matter.
- Short sentences, one idea each. Cut padding: never write "please note that", "as
  per", "kindly", "hereby", "in order to" — say the thing directly.
- Avoid exclamation marks unless the moment genuinely earns one. Never stack
  punctuation. No emoji unless the brief's category is explicitly light (e.g. a casual
  social post) — never in anything transactional or formal.
- Lead with what matters to the reader, not the product name or feature list.
`.trim();
```

### Integration: `App/aiServerPlugin.ts`

`RELIANCE_SYSTEM_PROMPT` imports `RELIANCE_BRAND_VOICE` from `./src/ai/brandVoice` and
appends it after the existing operational framing (the paragraph describing Reliance
Builder's job: classify, ask follow-ups, author content, never choose colors/fonts/
spacing). The existing paragraph stays first (it defines the task); the brand-voice
block follows (it defines how the task's output should read). Both `CLASSIFY_TOOL` and
`PLAN_TOOL` calls already share this one system prompt, so no per-call-site change is
needed beyond the prompt string itself.

### Testing

No automated test suite exists in this project. Verification is manual: submit a build
prompt through the running dev app (with `ANTHROPIC_API_KEY` set) and check the
generated headline/body copy against the style rules above (sentence case, no
superlatives, ₹ formatting if a price appears, no stacked punctuation) — comparing
output before and after this change on the same prompt.
