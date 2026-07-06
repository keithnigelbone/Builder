import { useEffect, useState } from 'react';
import { Container, Text, CircularProgressIndicator, Image } from '@jds4/oneui-react';
import type { BuildPlan } from '../../ai/schema';
import { describeHeroImage } from '../../ai/schema';
import { pickMotionTokens } from '../../data/motionMapping';

export function MotionPreview({ plan, feelingAnswerId }: { plan: BuildPlan; feelingAnswerId: string | undefined }) {
  const { duration, easing } = pickMotionTokens(feelingAnswerId);
  const [pulsed, setPulsed] = useState(false);

  useEffect(() => {
    // Continuous decorative animation — skip it entirely for users who've
    // asked their OS to reduce motion, rather than just shortening it.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setPulsed((p) => !p), 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <Container
      variant="full-bleed"
      layout="flex"
      direction="column"
      align="center"
      justify="center"
      gap="4"
      width="full"
      style={{ height: '100%' }}
    >
      {plan.heroImage && <Image src={plan.heroImage} alt={describeHeroImage(plan)} aspectRatio="1:1" width={120} />}
      <CircularProgressIndicator variant="indeterminate" size="XL" aria-label="Motion preview" />
      <div
        style={{
          width: pulsed ? 96 : 56,
          height: 8,
          borderRadius: 'var(--Shape-Pill)',
          background: 'var(--Primary-Bold)',
          transition: `width ${duration ? `var(--${duration})` : '200ms'} ${easing ? `var(--${easing})` : 'ease'}`,
        }}
      />
      <Container variant="full-bleed" layout="flex" direction="column" gap="1" align="center" style={{ maxWidth: 320 }}>
        <Text variant="label" size="M" weight="high" textAlign="center">
          {plan.motionConcept || 'Motion concept'}
        </Text>
        <Text variant="body" size="S" appearance="neutral" textAlign="center">
          {plan.motionDescription || 'Live motion, not a static mock.'}
          {duration ? ` Uses Reliance's ${duration}${easing ? ` / ${easing}` : ''}.` : ''}
        </Text>
      </Container>
    </Container>
  );
}
