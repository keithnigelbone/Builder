/**
 * This app is locked to a single brand: Reliance.
 *
 * How that traces back to oneui.brands.json (the source of truth for which
 * brands exist at all): App/vite.config.ts reads the file once at
 * build/dev-server-start time (Node fs, not the browser), and — on purpose —
 * only ever hands the Reliance entry to the `oneui()` Vite plugin, so no
 * other brand's CSS/tokens are ever fetched or cached, even though
 * oneui.brands.json itself may list more (jio, swadesh, ...). The full
 * parsed file is still injected as `__ONEUI_BRANDS_CONFIG__` (see
 * App/src/vite-env.d.ts) purely so this module can assert Reliance is
 * actually declared there and fail loudly if it's ever removed — the app
 * never reads or exposes the other brands.
 *
 * There is intentionally no brand switcher anywhere in this app: no prop,
 * no context, no UI control. `ACTIVE_BRAND` is the only brand value used.
 */

const ACTIVE_BRAND = 'reliance' as const;

if (!(ACTIVE_BRAND in __ONEUI_BRANDS_CONFIG__.brands)) {
  throw new Error(
    `oneui.brands.json no longer declares "${ACTIVE_BRAND}" — this app is Reliance-only and has nothing to fall back to.`,
  );
}

export { ACTIVE_BRAND };
