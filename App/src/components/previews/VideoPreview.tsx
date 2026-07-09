import { useState } from 'react';
import { Container, Text, Badge, Surface, Button } from '@jds4/oneui-react';
import type { BuildPlan } from '../../ai/schema';
import { describeHeroImage } from '../../ai/schema';
import { assembleVideoPrompt } from '../../ai/videoPrompt';
import { requestMotionVideo } from '../../media/videoGenerator';
import { HERO_SCRIM } from './website/shared';

/**
 * Video is previewed as a storyboard concept: the canvas (this component,
 * rendered inside PreviewFrame at the destination's true dimensions) shows
 * the opening treatment inside dashed safe-area guides; the concept detail
 * block (VideoConceptDetails, rendered by BuildPreview below the frame)
 * carries the beats, copy, assembled Veo prompt, and opt-in generation.
 */

/** Dashed guide geometry per ratio family — a concept aid, not a broadcast spec. */
function safeAreaInsets(ratio: string): { inset: string } {
  if (ratio === '9:16' || ratio === '4:5') return { inset: '12% 8%' };
  if (ratio === '21:9') return { inset: '8% 18%' };
  if (ratio === '1.91:1') return { inset: '10% 8%' };
  return { inset: '6% 5%' }; // 16:9, 1:1, and anything custom
}

export function VideoPreview({ plan }: { plan: BuildPlan }) {
  const format = plan.videoFormat;
  const guides = safeAreaInsets(format?.ratio ?? '16:9');

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: plan.heroImage ? undefined : 'var(--Surface-Bold)',
      }}
    >
      {/* A real <img> rather than a CSS background: Chromium silently refused
          to paint multi-layer backgrounds whose image layer is a multi-MB
          data URL (observed live on the hosted canvas — computed style kept
          the layers, paint never happened), while <img> data URLs render
          reliably everywhere in this app. */}
      {plan.heroImage && (
        <>
          <img
            src={plan.heroImage}
            alt={describeHeroImage(plan)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: HERO_SCRIM }} />
        </>
      )}

      {/* Safe-area guides — always on: this is a concept artifact. */}
      <div
        data-safe-area={format?.ratio ?? '16:9'}
        style={{
          position: 'absolute',
          inset: guides.inset,
          border: '2px dashed rgba(255,255,255,0.45)',
          borderRadius: 8,
          pointerEvents: 'none',
        }}
      />

      {/* Container renders as a Surface in mode="ghost" (its default when no
          `surface` prop is passed), which paints an opaque background
          matching the nearest ANCESTOR SURFACE's resolved step — not true
          CSS transparency. That ancestor is FrameChrome's `<Surface
          mode="default">` (PreviewFrame.tsx), which resolves to opaque
          white. Every Container here (this one and the two nested ones
          below) therefore painted solid white on top of the absolutely
          positioned img/scrim behind it, in DOM/paint order — hiding the
          backdrop completely regardless of whether it was a CSS
          background or an <img> element. `background: 'transparent'` on
          each Container's inline style overrides that opaque paint (inline
          styles win over the generated data-surface-step stylesheet rule)
          without changing layout. */}
      <Container
        variant="full-bleed"
        layout="flex"
        direction="column"
        justify="space-between"
        width="full"
        padding="10"
        style={{ position: 'relative', height: '100%', boxSizing: 'border-box', background: 'transparent' }}
      >
        <Container variant="full-bleed" layout="flex" justify="space-between" align="center" width="full" style={{ background: 'transparent' }}>
          {format && (
            <Badge size="m" appearance="brand-bg">
              {format.ratio}
            </Badge>
          )}
          {plan.recommendedDuration && (
            <Text variant="label" size="S" style={{ color: 'var(--Text-OnBold-Medium, #fff)' }}>
              {plan.recommendedDuration}
            </Text>
          )}
        </Container>

        <Container variant="full-bleed" layout="flex" direction="column" gap="3" width="full" style={{ background: 'transparent' }}>
          <Text variant="display" size="M" style={{ color: 'var(--Text-OnBold-High, #fff)', maxWidth: '90%' }}>
            {plan.headline}
          </Text>
          {plan.openingShot && (
            <Text variant="body" size="M" style={{ color: 'var(--Text-OnBold-Medium, #fff)', maxWidth: '85%' }}>
              Opening: {plan.openingShot}
            </Text>
          )}
        </Container>
      </Container>
    </div>
  );
}

type VideoState = { status: 'idle' | 'generating' | 'done' | 'error'; videoUrl?: string; error?: string };

export function VideoConceptDetails({ plan }: { plan: BuildPlan }) {
  const format = plan.videoFormat;
  const [videoState, setVideoState] = useState<VideoState>({ status: 'idle' });
  const canGenerate = !!(plan.imageSubject && plan.imageAction && plan.imageLocation && plan.imageFraming);

  const handleGenerate = async () => {
    setVideoState({ status: 'generating' });
    const result = await requestMotionVideo(plan);
    if (result.videoUrl) setVideoState({ status: 'done', videoUrl: result.videoUrl });
    else setVideoState({ status: 'error', error: result.error || 'Video generation failed.' });
  };

  return (
    <Container variant="full-bleed" layout="flex" direction="column" gap="4" width="full" padding="4">
      <Container variant="full-bleed" layout="flex" gap="2" wrap align="center">
        {format && (
          <>
            <Badge size="s" appearance="primary">
              {format.label}
            </Badge>
            <Badge size="s" appearance="primary">
              {format.ratio}
            </Badge>
            <Text variant="label" size="S" appearance="neutral">
              {format.width} × {format.height}
            </Text>
          </>
        )}
        {plan.recommendedDuration && (
          <Text variant="label" size="S" appearance="neutral">
            {plan.recommendedDuration}
          </Text>
        )}
      </Container>

      {/* Text doesn't forward data-testid to the DOM (it destructures a
          fixed prop list — see Text.mjs), so the test hook lives on a
          wrapper div instead. */}
      {format && (
        <div data-testid="safe-area-guidance">
          <Text variant="body" size="S" appearance="neutral">
            Safe areas: {format.safeArea.join(' ')}
            {format.note ? ` ${format.note}` : ''}
          </Text>
        </div>
      )}

      {plan.subheadline && (
        <Text variant="body" size="M" appearance="neutral">
          {plan.subheadline}
        </Text>
      )}

      {plan.keyScenes && plan.keyScenes.length > 0 && (
        <Container variant="full-bleed" layout="grid" columns={Math.min(plan.keyScenes.length, 5)} gap="4" width="full">
          {plan.keyScenes.map((scene, i) => (
            <Surface key={scene.title} mode="subtle" style={{ padding: 'var(--Spacing-4)', borderRadius: 'var(--Shape-2)' }}>
              <Text variant="label" size="S" appearance="primary">
                {String(i + 1).padStart(2, '0')}
              </Text>
              <Text variant="label" size="M" weight="high">
                {scene.title}
              </Text>
              <Text variant="body" size="S" appearance="neutral">
                {scene.description}
              </Text>
            </Surface>
          ))}
        </Container>
      )}

      {plan.closingFrame && (
        <div data-testid="closing-frame">
          <Text variant="body" size="S" appearance="neutral">
            Closing frame: {plan.closingFrame}
          </Text>
        </div>
      )}

      {plan.voiceoverCopy && (
        <Surface mode="subtle" style={{ padding: 'var(--Spacing-4)', borderRadius: 'var(--Shape-2)' }}>
          <Text variant="label" size="S" appearance="neutral">
            Voiceover / on-screen copy
          </Text>
          {/* A semantic <q> renders its own quote marks via the browser's
              UA stylesheet (generated content, not text nodes) instead of
              literal quote characters — so the accessible text here is just
              the copy itself, distinct from the quoted form that appears
              inside the assembled Veo prompt below. */}
          <Text variant="title" size="S">
            <q>{plan.voiceoverCopy}</q>
          </Text>
        </Surface>
      )}

      <details style={{ width: '100%' }}>
        <summary style={{ cursor: 'pointer' }}>
          <Text variant="label" size="S" appearance="neutral">
            Veo-ready prompt
          </Text>
        </summary>
        <Surface mode="subtle" style={{ padding: 'var(--Spacing-4)', borderRadius: 'var(--Shape-2)', marginTop: 'var(--Spacing-2)' }}>
          <Text variant="body" size="S" appearance="neutral" style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--Typography-Font-Code, monospace)' }}>
            {assembleVideoPrompt(plan)}
          </Text>
          {format && format.veoAspectRatio !== format.ratio && (
            <Text variant="label" size="XS" appearance="neutral" style={{ marginTop: 'var(--Spacing-2)' }}>
              Generates at {format.veoAspectRatio}; deliver/crop at {format.ratio}.
            </Text>
          )}
        </Surface>
      </details>

      {videoState.status === 'done' && videoState.videoUrl ? (
        <video src={videoState.videoUrl} controls autoPlay loop muted style={{ maxWidth: '100%', maxHeight: 360, borderRadius: 'var(--Shape-3)' }} />
      ) : (
        canGenerate && (
          <Container variant="full-bleed" width="fit">
            <Button
              attention="medium"
              size="m"
              onClick={handleGenerate}
              disabled={videoState.status === 'generating'}
              loading={videoState.status === 'generating'}
            >
              {videoState.status === 'generating' ? 'Generating video… this can take a few minutes' : 'Generate video'}
            </Button>
          </Container>
        )
      )}

      {videoState.status === 'error' && (
        <Text variant="body" size="S" appearance="negative">
          {videoState.error}
        </Text>
      )}
    </Container>
  );
}
