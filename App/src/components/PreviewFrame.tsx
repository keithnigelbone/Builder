import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Container, SelectableButton, Surface } from '@jds4/oneui-react';
import { DIMENSIONS, type DimensionVariant } from '../data/previewDimensions';
import type { BuildCategoryId } from '../types';

type Chrome = 'browser' | 'phone' | 'none';

interface PreviewFrameProps {
  category: BuildCategoryId;
  variantId: string;
  onVariantChange: (id: string) => void;
  chrome: Chrome;
  children: ReactNode;
}

/**
 * Renders `children` at the format's *real* pixel dimensions (see
 * data/previewDimensions.ts) inside a fixed-size canvas, then CSS-scales the
 * whole thing down to fit the available panel width. This is why the
 * preview is proportionally accurate instead of an arbitrary aspect-ratio
 * box with guessed content sizing.
 */
export function PreviewFrame({ category, variantId, onVariantChange, chrome, children }: PreviewFrameProps) {
  const variants = DIMENSIONS[category];
  const variant = variants.find((v) => v.id === variantId) ?? variants[0];
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(720);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setContainerWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Cap the visual height so tall formats (story, mobile) don't dominate the
  // page — the canvas is still built at real width, just capped on scale.
  const maxVisualHeight = 560;
  const scale = Math.min(containerWidth / variant.width, maxVisualHeight / variant.height, 1);

  return (
    <Container variant="full-bleed" layout="flex" direction="column" gap="3" width="full">
      {variants.length > 1 && (
        <Container variant="full-bleed" layout="flex" gap="2" wrap>
          {variants.map((v) => (
            <SelectableButton key={v.id} size="s" selected={v.id === variant.id} onSelectedChange={() => onVariantChange(v.id)}>
              {v.label}
            </SelectableButton>
          ))}
        </Container>
      )}

      <div ref={containerRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: variant.width * scale, height: variant.height * scale }}>
          <FrameChrome chrome={chrome} width={variant.width} height={variant.height} scale={scale}>
            {children}
          </FrameChrome>
        </div>
      </div>
    </Container>
  );
}

function FrameChrome({
  chrome,
  width,
  height,
  scale,
  children,
}: {
  chrome: Chrome;
  width: number;
  height: number;
  scale: number;
  children: ReactNode;
}) {
  // Each preview canvas gets its own fresh Surface (mode="default" always
  // resets to the base step regardless of parent nesting — see
  // Surface.mjs's step-resolution logic). Without this, the canvas just
  // inherits var(--Surface-Default) from whatever elevation context the
  // surrounding tool chrome happens to be nested at (e.g. BuildPreview's
  // Surface mode="moderate"), which recontextualizes it to a tinted brand
  // color instead of white. The previewed website/screen/slide/post is
  // its own independent page — it should never visually inherit the
  // Builder tool's own panel depth.
  // overflowY: 'auto' lets content taller than the format's real height
  // (e.g. a website with several sections) scroll within the fixed-size
  // canvas instead of being silently clipped. overflowX stays hidden since
  // width is the one dimension previews are meant to fit exactly.
  const canvas = (
    <div
      style={{
        width,
        height,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      <Surface mode="default" style={{ width: '100%', minHeight: '100%' }}>
        {children}
      </Surface>
    </div>
  );

  if (chrome === 'browser') {
    const barHeight = 28;
    return (
      <div style={{ width: width * scale, height: height * scale, borderRadius: 'var(--Shape-2)', overflow: 'hidden', boxShadow: '0 0 0 1px var(--Neutral-Stroke-Low)' }}>
        <div style={{ height: barHeight, display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', background: 'var(--Surface-Subtle)' }}>
          {['#ff5f57', '#febc2e', '#28c840'].map((color) => (
            <span key={color} style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
          ))}
        </div>
        <div style={{ width, height: height - barHeight / scale, transform: `scale(${scale})`, transformOrigin: 'top left', overflowY: 'auto', overflowX: 'hidden' }}>
          <Surface mode="default" style={{ width: '100%', minHeight: '100%' }}>
            {children}
          </Surface>
        </div>
      </div>
    );
  }

  if (chrome === 'phone') {
    return (
      <div
        style={{
          width: width * scale,
          height: height * scale,
          borderRadius: 'var(--Shape-6)',
          border: `${3 * scale}px solid var(--Neutral-Bold)`,
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {canvas}
      </div>
    );
  }

  return canvas;
}
