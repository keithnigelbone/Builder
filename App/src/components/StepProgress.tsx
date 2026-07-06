import { Text } from '@jds4/oneui-react';

/**
 * TEMPORARY FALLBACK: no OneUI component maps to a "step N of M" progress
 * indicator (Stepper is a numeric increment control, Pagination/PaginationDots
 * are for paged content, not a wizard). This is a minimal hand-built
 * replacement using only Text + a plain div, clearly marked so it's obvious
 * this isn't a real design-system component.
 */
export function StepProgress({ step, total }: { step: number; total: number }) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--Spacing-2)' }}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          style={{
            width: i === step ? 20 : 6,
            height: 6,
            borderRadius: 999,
            transition: prefersReducedMotion ? 'none' : 'width 200ms ease',
            background: i <= step ? 'var(--Primary-Bold, #444)' : 'var(--Neutral-Subtle, #ddd)',
          }}
        />
      ))}
      <Text variant="label" size="XS" appearance="neutral">
        Step {step + 1} of {total}
      </Text>
    </div>
  );
}
