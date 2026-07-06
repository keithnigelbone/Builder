import { useEffect, useState } from 'react';
import { Container, Text, CircularProgressIndicator, Image, Button } from '@jds4/oneui-react';
import type { BuildPlan } from '../../ai/schema';
import { describeHeroImage } from '../../ai/schema';
import { pickMotionTokens } from '../../data/motionMapping';
import { requestMotionVideo } from '../../ai/client';

type VideoState = { status: 'idle' | 'generating' | 'done' | 'error'; videoUrl?: string; error?: string };

export function MotionPreview({ plan, feelingAnswerId }: { plan: BuildPlan; feelingAnswerId: string | undefined }) {
  const { duration, easing } = pickMotionTokens(feelingAnswerId);
  const [pulsed, setPulsed] = useState(false);
  const [videoState, setVideoState] = useState<VideoState>({ status: 'idle' });

  useEffect(() => {
    // Continuous decorative animation — skip it entirely for users who've
    // asked their OS to reduce motion, rather than just shortening it.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setPulsed((p) => !p), 1400);
    return () => clearInterval(id);
  }, []);

  const canGenerateVideo = !!(plan.imageSubject && plan.imageAction && plan.imageLocation && plan.imageFraming);

  const handleGenerateVideo = async () => {
    setVideoState({ status: 'generating' });
    const result = await requestMotionVideo(plan);
    if (result.videoUrl) {
      setVideoState({ status: 'done', videoUrl: result.videoUrl });
    } else {
      setVideoState({ status: 'error', error: result.error || 'Video generation failed.' });
    }
  };

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
      {videoState.status === 'done' && videoState.videoUrl ? (
        <video
          src={videoState.videoUrl}
          controls
          autoPlay
          loop
          muted
          style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 'var(--Shape-3)' }}
        />
      ) : (
        <>
          {plan.heroImage && <Image src={plan.heroImage} alt={describeHeroImage(plan)} aspectRatio="1:1" width={120} />}
          <CircularProgressIndicator variant="indeterminate" size="XL" aria-label="Motion preview" />
        </>
      )}
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

      {canGenerateVideo && videoState.status !== 'done' && (
        <Button
          attention="medium"
          size="m"
          onClick={handleGenerateVideo}
          disabled={videoState.status === 'generating'}
          loading={videoState.status === 'generating'}
        >
          {videoState.status === 'generating' ? 'Generating video… this can take a few minutes' : 'Generate video'}
        </Button>
      )}

      {videoState.status === 'error' && (
        <Text variant="body" size="S" appearance="negative" textAlign="center">
          {videoState.error}
        </Text>
      )}
    </Container>
  );
}
