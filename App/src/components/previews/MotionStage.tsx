import type { ReactNode } from 'react';
import { Container, CircularProgressIndicator, Image, Surface, Switch } from '@jds4/oneui-react';
import { BrandMark } from '../BrandMark';

interface MotionStageProps {
  concept: string;
  heroImage?: string;
  heroAlt: string;
  /** Reliance motion token *names* from pickMotionTokens, e.g. "Motion-Duration-M". */
  duration?: string;
  easing?: string;
}

/**
 * One animated stage per motion concept — pure CSS animations composed from
 * Reliance motion/colour/shape tokens (the AI never chooses these; it only
 * chose the concept). Under prefers-reduced-motion the stage renders its
 * final frame with no <style> tag and no animation at all.
 */
export function MotionStage({ concept, heroImage, heroAlt, duration, easing }: MotionStageProps) {
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dur = duration ? `var(--${duration})` : '400ms';
  const ease = easing ? `var(--${easing})` : 'ease';

  const keyframes = (
    <style>{`
      @keyframes rb-pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.35); opacity: 0.55; } }
      @keyframes rb-slide { 0%, 45% { transform: translateX(0); } 55%, 100% { transform: translateX(-50%); } }
      @keyframes rb-intro { 0% { transform: scale(0.7); opacity: 0; } 35%, 80% { transform: scale(1); opacity: 1; } 100% { transform: scale(0.7); opacity: 0; } }
      @keyframes rb-reveal { 0% { clip-path: inset(0 100% 0 0); } 45%, 80% { clip-path: inset(0 0 0 0); } 100% { clip-path: inset(0 100% 0 0); } }
      @keyframes rb-tap { 0%, 100% { transform: translateY(0); } 15% { transform: translateY(4px); } 30% { transform: translateY(0); } }
    `}</style>
  );

  const stage = (children: ReactNode) => (
    <Container
      variant="full-bleed"
      layout="flex"
      align="center"
      justify="center"
      width="full"
      style={{ minHeight: 220, overflow: 'hidden', borderRadius: 'var(--Shape-3)', background: 'var(--Surface-Subtle)' }}
    >
      {!reduced && keyframes}
      {children}
    </Container>
  );

  switch (concept) {
    case 'transition':
      return stage(
        <div style={{ width: '70%', display: 'flex', gap: 12, animation: reduced ? undefined : `rb-slide 2.8s ${ease} infinite` }}>
          <Surface mode="bold" appearance="primary" style={{ minWidth: '100%', height: 120, borderRadius: 'var(--Shape-3)' }} />
          <Surface mode="moderate" style={{ minWidth: '100%', height: 120, borderRadius: 'var(--Shape-3)' }} />
        </div>,
      );
    case 'intro-animation':
      return stage(
        <div style={{ animation: reduced ? undefined : `rb-intro 3s ${ease} infinite` }}>
          <BrandMark size={96} />
        </div>,
      );
    case 'product-reveal':
      return stage(
        <div style={{ width: '70%', animation: reduced ? undefined : `rb-reveal 3.4s ${ease} infinite` }}>
          {heroImage ? (
            <Image src={heroImage} alt={heroAlt} aspectRatio="16:9" width="full" />
          ) : (
            <Surface
              mode="bold"
              appearance="primary"
              style={{ aspectRatio: '16 / 9', borderRadius: 'var(--Shape-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <BrandMark size={48} onBold />
            </Surface>
          )}
        </div>,
      );
    case 'micro-interaction':
      return stage(
        <div style={{ animation: reduced ? undefined : `rb-tap 1.8s ${ease} infinite` }}>
          <Switch defaultChecked aria-label="Example toggle" />
        </div>,
      );
    case 'loader':
    default:
      return stage(
        <Container variant="full-bleed" layout="flex" direction="column" align="center" gap="4" width="fit">
          <CircularProgressIndicator variant="indeterminate" size="XL" aria-label="Motion preview" />
          <div style={{ display: 'flex', gap: 8 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 'var(--Shape-Pill)',
                  background: 'var(--Primary-Bold)',
                  animation: reduced ? undefined : `rb-pulse 1.4s ${ease} ${i * 0.18}s infinite`,
                  animationDuration: reduced ? undefined : dur,
                }}
              />
            ))}
          </div>
        </Container>,
      );
  }
}
