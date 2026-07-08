import { Container, Text, Badge, Image, Surface } from '@jds4/oneui-react';
import type { SlideContent } from '../../ai/schema';
import { BrandMark } from '../BrandMark';

function CoverSlide({ slide }: { slide: SlideContent }) {
  return (
    <Surface
      mode="bold"
      appearance="primary"
      style={{ height: '100%', width: '100%', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}
    >
      <div
        style={{
          position: 'absolute',
          right: -100,
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: 0.18,
          pointerEvents: 'none',
        }}
      >
        <BrandMark size={480} onBold />
      </div>
      <Container
        variant="full-bleed"
        layout="flex"
        direction="column"
        justify="space-between"
        width="full"
        padding="10"
        style={{ height: '100%', boxSizing: 'border-box', position: 'relative' }}
      >
        <BrandMark size={28} onBold />
        <Container variant="full-bleed" layout="flex" direction="column" gap="3" width="full" style={{ maxWidth: '65%' }}>
          <Text variant="display" size="L" style={{ color: 'var(--Text-OnBold-High, #fff)' }}>
            {slide.headline}
          </Text>
          {slide.subheadline && (
            <Text variant="title" size="S" style={{ color: 'var(--Text-OnBold-Medium, #fff)' }}>
              {slide.subheadline}
            </Text>
          )}
        </Container>
        <div />
      </Container>
    </Surface>
  );
}

function DividerSlide({ slide }: { slide: SlideContent }) {
  return (
    <Surface mode="bold" appearance="primary" style={{ height: '100%', width: '100%', boxSizing: 'border-box' }}>
      <Container
        variant="full-bleed"
        layout="flex"
        align="center"
        width="full"
        padding="10"
        style={{ height: '100%', boxSizing: 'border-box' }}
      >
        <Text variant="display" size="L" style={{ color: 'var(--Text-OnBold-High, #fff)' }}>
          {slide.headline}
        </Text>
      </Container>
    </Surface>
  );
}

function ContentSlide({ slide, heroImage }: { slide: SlideContent; heroImage?: string }) {
  return (
    <Container
      variant="full-bleed"
      layout="flex"
      direction="column"
      justify="space-between"
      width="full"
      padding="10"
      style={{ height: '100%', boxSizing: 'border-box' }}
    >
      <Container variant="full-bleed" layout="flex" align="center" justify="space-between" width="full">
        <Badge size="m" appearance="primary">
          {slide.kicker || 'Section'}
        </Badge>
        <BrandMark size={28} />
      </Container>

      <Container variant="full-bleed" layout="flex" direction="column" gap="4" width="full">
        <Text variant="display" size="L">
          {slide.headline}
        </Text>
        {slide.body && (
          <Text variant="title" size="S" appearance="neutral" style={{ maxWidth: '70%' }}>
            {slide.body}
          </Text>
        )}
        {heroImage && (
          <Container variant="full-bleed" width="full" style={{ maxHeight: 280 }}>
            <Image src={heroImage} alt={slide.headline || 'Slide image'} aspectRatio="16:9" width="full" />
          </Container>
        )}
      </Container>
    </Container>
  );
}

function SplitPhotoSlide({ slide, heroImage }: { slide: SlideContent; heroImage?: string }) {
  return (
    <Container variant="full-bleed" layout="flex" width="full" style={{ height: '100%', boxSizing: 'border-box' }}>
      <Container
        variant="full-bleed"
        layout="flex"
        direction="column"
        justify="space-between"
        gap="4"
        padding="10"
        style={{ width: '45%', height: '100%', boxSizing: 'border-box' }}
      >
        <BrandMark size={24} />
        <Container variant="full-bleed" layout="flex" direction="column" gap="3" width="full">
          {slide.kicker && (
            <Text variant="label" size="S" appearance="primary">
              {slide.kicker}
            </Text>
          )}
          <Text variant="title" size="L">
            {slide.headline}
          </Text>
          {slide.body && (
            <Text variant="body" size="M" appearance="neutral">
              {slide.body}
            </Text>
          )}
        </Container>
        <div />
      </Container>
      {heroImage && (
        <div style={{ width: '55%', height: '100%' }}>
          <Image src={heroImage} alt={slide.headline || 'Slide image'} aspectRatio="3:4" width="full" />
        </div>
      )}
    </Container>
  );
}

function TableSlide({ slide }: { slide: SlideContent }) {
  const columns = slide.tableColumns ?? [];
  return (
    <Container
      variant="full-bleed"
      layout="flex"
      direction="column"
      gap="5"
      width="full"
      padding="10"
      style={{ height: '100%', boxSizing: 'border-box' }}
    >
      <Text variant="title" size="L">
        {slide.headline}
      </Text>
      <Container variant="full-bleed" layout="grid" columns={Math.max(columns.length, 1)} gap="4" width="full" grow={1}>
        {columns.map((col) => (
          <Surface key={col.header} mode="subtle" style={{ padding: 'var(--Spacing-4)', borderRadius: 'var(--Shape-2)' }}>
            <Text variant="label" size="M" weight="high">
              {col.header}
            </Text>
            <Container variant="full-bleed" layout="flex" direction="column" gap="2" width="full" style={{ marginTop: 'var(--Spacing-3)' }}>
              {col.items.map((item) => (
                <Text key={item} variant="body" size="S" appearance="neutral">
                  • {item}
                </Text>
              ))}
            </Container>
          </Surface>
        ))}
      </Container>
    </Container>
  );
}

function StatSlide({ slide }: { slide: SlideContent }) {
  return (
    <Container
      variant="full-bleed"
      layout="flex"
      direction="column"
      justify="space-between"
      width="full"
      padding="10"
      style={{ height: '100%', boxSizing: 'border-box' }}
    >
      <Container variant="full-bleed" layout="flex" align="center" justify="space-between" width="full">
        <Badge size="m" appearance="primary">
          {slide.headline}
        </Badge>
        <BrandMark size={28} />
      </Container>
      <Container variant="full-bleed" layout="flex" direction="column" gap="2" width="full">
        <Text variant="display" size="L" appearance="primary">
          {slide.statValue}
        </Text>
        {slide.statLabel && (
          <Text variant="title" size="S" appearance="neutral">
            {slide.statLabel}
          </Text>
        )}
      </Container>
    </Container>
  );
}

function ClosingSlide({ slide }: { slide: SlideContent }) {
  return (
    <Surface mode="bold" appearance="primary" style={{ height: '100%', width: '100%', boxSizing: 'border-box' }}>
      <Container
        variant="full-bleed"
        layout="flex"
        direction="column"
        align="center"
        justify="center"
        gap="3"
        width="full"
        padding="10"
        style={{ height: '100%', boxSizing: 'border-box' }}
      >
        <Text variant="display" size="L" textAlign="center" style={{ color: 'var(--Text-OnBold-High, #fff)' }}>
          {slide.headline}
        </Text>
        {slide.subheadline && (
          <Text variant="title" size="S" textAlign="center" style={{ color: 'var(--Text-OnBold-Medium, #fff)' }}>
            {slide.subheadline}
          </Text>
        )}
        <BrandMark size={32} onBold />
      </Container>
    </Surface>
  );
}

export function SlidePreview({ slide, heroImage }: { slide: SlideContent; heroImage?: string }) {
  switch (slide.slideType) {
    case 'cover':
      return <CoverSlide slide={slide} />;
    case 'divider':
      return <DividerSlide slide={slide} />;
    case 'split-photo':
      return <SplitPhotoSlide slide={slide} heroImage={heroImage} />;
    case 'table':
      return <TableSlide slide={slide} />;
    case 'stat':
      return slide.statValue ? <StatSlide slide={slide} /> : <ContentSlide slide={slide} heroImage={heroImage} />;
    case 'closing':
      return <ClosingSlide slide={slide} />;
    case 'content':
    default:
      return <ContentSlide slide={slide} heroImage={heroImage} />;
  }
}
