/**
 * Framer MCP quality layer — a graceful seam, honestly labelled.
 *
 * A running Vite app cannot invoke Claude Code MCP servers, so this cannot
 * make live Framer MCP calls. It checks for a configured endpoint and, for
 * now, contributes nothing either way — but it is the single place a real
 * Framer-derived hint source would plug into the critique rubric, and the
 * app's behavior is already correct with it absent (the spec's "fall back
 * gracefully, never expose MCPs to the end user").
 */
let warnedOnce = false;

export function getFramerQualityHints(): string[] | undefined {
  if (!process.env.FRAMER_MCP_URL) return undefined;
  if (!warnedOnce) {
    console.warn('[reliance-builder] FRAMER_MCP_URL is set, but live MCP calls are not implemented — ignoring it.');
    warnedOnce = true;
  }
  return undefined;
}
