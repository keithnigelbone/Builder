# Reliance Builder brand-voice guidance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Reliance Builder's Claude system prompt a condensed Grounded Confidence brand-voice reference, so generated headlines/copy/captions match Reliance's brand voice instead of the current thin one-line instruction.

**Architecture:** One new module (`App/src/ai/brandVoice.ts`) exports a single constant string of condensed brand-voice guidance; `App/aiServerPlugin.ts`'s existing `RELIANCE_SYSTEM_PROMPT` imports and appends it. No other files change.

**Tech Stack:** TypeScript, Vite dev-server plugin (`App/aiServerPlugin.ts`), Anthropic Messages API.

## Global Constraints

- Source material is condensed/adapted from `Conversation/Reliance_AI_Assistant_LLM_Rules.md` and `Conversation/Reliance_AI_Assistant_Builders_Guide.md` — not included verbatim (per design spec's stated goal of avoiding ~100KB of largely inapplicable conversational-chatbot rules).
- `App/src/ai/fallbackPlan.ts` (the deterministic, no-API-key fallback) is out of scope — not modified.
- No per-domain tone branching (finance/entertainment/retail, etc.) — one consistent voice for all output categories.
- No changes to `CLASSIFY_TOOL` or `PLAN_TOOL` schemas — this is a system-prompt content change only.
- `component_test` has no automated test runner (no vitest/jest) — verification is manual, via the running dev server and a real `/api/claude` call, same approach used in the prior env-loading/Storybook-gate plan.

---

### Task 1: Add brand-voice module and wire it into the system prompt

**Files:**
- Create: `App/src/ai/brandVoice.ts`
- Modify: `App/aiServerPlugin.ts:1-31`

**Interfaces:**
- Produces: `RELIANCE_BRAND_VOICE: string` (exported from `App/src/ai/brandVoice.ts`), consumed by `App/aiServerPlugin.ts`'s `RELIANCE_SYSTEM_PROMPT` constant. Nothing else in the codebase references either symbol.

- [ ] **Step 1: Create `App/src/ai/brandVoice.ts`**

```ts
/**
 * Condensed Grounded Confidence brand-voice guidance for Reliance Builder's
 * Claude-authored content. Adapted from Conversation/Reliance_AI_Assistant_LLM_Rules.md
 * and Conversation/Reliance_AI_Assistant_Builders_Guide.md — condensed to what applies
 * to one-shot static copy (headlines, body, captions), not live conversational turns.
 */
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

- [ ] **Step 2: Modify `App/aiServerPlugin.ts`**

Add the import alongside the existing two imports at the top of the file:

```ts
import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { RELIANCE_BRAND_VOICE } from './src/ai/brandVoice';
```

Then replace the `RELIANCE_SYSTEM_PROMPT` constant:

```ts
const RELIANCE_SYSTEM_PROMPT = `You are the reasoning layer behind "Reliance Builder", a tool that turns a short
user prompt into a Reliance-branded visual first draft. You never choose colors, fonts,
spacing, or component styling yourself — those always come from Reliance's real design
tokens, applied by the app after you respond. Your job is purely: understand intent,
classify the right output format, ask sharp follow-up questions when useful, and author
clear, presentation-ready CONTENT (headlines, copy, structure) for the chosen format.
Keep copy concise, confident, and on-brand for Reliance (a large, trusted Indian
conglomerate) — no filler, no placeholder-sounding text like "Lorem ipsum".`;
```

with:

```ts
const RELIANCE_SYSTEM_PROMPT = `You are the reasoning layer behind "Reliance Builder", a tool that turns a short
user prompt into a Reliance-branded visual first draft. You never choose colors, fonts,
spacing, or component styling yourself — those always come from Reliance's real design
tokens, applied by the app after you respond. Your job is purely: understand intent,
classify the right output format, ask sharp follow-up questions when useful, and author
clear, presentation-ready CONTENT (headlines, copy, structure) for the chosen format.

${RELIANCE_BRAND_VOICE}`;
```

Nothing else in `App/aiServerPlugin.ts` changes — `CLASSIFY_TOOL`, `PLAN_TOOL`, `callAnthropic`, and the `/api/claude` handler all reference `RELIANCE_SYSTEM_PROMPT` by name already and need no edits.

- [ ] **Step 3: Verify the repo-root `.env` still has a working key**

Run: `grep -c ANTHROPIC_API_KEY /Users/keithbone/component_test/.env`
Expected: `1`

- [ ] **Step 4: Start the dev server**

Run (from `/Users/keithbone/component_test`), in the background: `npm run app:dev`
Expected: log output showing a local URL (e.g. `Local: http://localhost:5173/` or the next free port).

- [ ] **Step 5: Verify the classify call still works and inspect the plan call's content against the style rules**

Run:
```bash
curl -s -X POST http://localhost:5173/api/claude \
  -H 'content-type: application/json' \
  -d '{"type":"plan","category":"social-media","prompt":"announce a new prepaid plan with more data","answers":{},"availableComponents":["Button","Chip","Badge"]}'
```
(Adjust the port in the URL if Task 4's log showed a different one.)

Expected: a `{"result": {...}}` body (not a 503/502 error) containing a `headline` and
other authored fields. Manually check the returned text against the style rules in
`RELIANCE_BRAND_VOICE`: sentence case (not Title Case) in the headline, no exclamation
marks, no words like "revolutionary"/"game-changing"/"best", ₹ (not "Rs."/"INR") if a
price appears, no Oxford comma. This is a qualitative check — the model won't violate
every rule in one response, so look for obvious contradictions rather than perfect
adherence to every bullet.

- [ ] **Step 6: Stop the dev server**

Stop the background `npm run app:dev` process.

- [ ] **Step 7: Commit**

```bash
git add App/src/ai/brandVoice.ts App/aiServerPlugin.ts
git commit -m "Add Grounded Confidence brand-voice guidance to Reliance Builder's system prompt"
```

---

## Self-Review Notes

- **Spec coverage:** the design spec's three deliverables — new `brandVoice.ts` module,
  system-prompt integration in `aiServerPlugin.ts`, and manual verification — are all
  covered by this single task. The spec's non-goals (fallback templates, per-domain
  branching, tool-schema changes) are explicitly called out in Global Constraints and
  nothing in Task 1 touches them.
- **No placeholders:** the full `RELIANCE_BRAND_VOICE` text and the full before/after
  `aiServerPlugin.ts` diff are written out verbatim — an implementer doesn't need to
  invent or summarize anything.
- **Type consistency:** `RELIANCE_BRAND_VOICE` is defined once (Step 1) and consumed
  once, by exact name, in Step 2 — no naming drift.
