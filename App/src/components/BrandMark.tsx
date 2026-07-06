import { Text } from '@jds4/oneui-react';
import { RELIANCE_LOGO_SVG } from '../data/relianceBrandMeta';

/** Reliance's real logo mark, fetched alongside its brand CSS — not a generic placeholder. */
export function BrandMark({ size, onBold }: { size: number; onBold?: boolean }) {
  if (!RELIANCE_LOGO_SVG) {
    return (
      <Text variant="label" size="M" weight="high">
        Reliance
      </Text>
    );
  }
  return (
    <span
      aria-label="Reliance"
      role="img"
      style={{ width: size, height: size, display: 'inline-block', filter: onBold ? 'brightness(0) invert(1)' : undefined }}
      dangerouslySetInnerHTML={{ __html: RELIANCE_LOGO_SVG }}
    />
  );
}
