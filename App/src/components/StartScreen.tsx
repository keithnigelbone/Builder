import { Container, Surface, Text, Input, Button, Chip, Icon, CircularProgressIndicator } from '@jds4/oneui-react';
import { BUILD_CATEGORIES } from '../data/buildCategories';
import type { BuildCategoryId } from '../types';
import { BrandMark } from './BrandMark';

const CATEGORY_ICONS: Record<BuildCategoryId, string> = {
  website: 'link',
  'app-screens': 'home',
  slides: 'copy',
  'social-media': 'share',
  motion: 'play',
};

interface StartScreenProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmitPrompt: () => void;
  onSelectCategory: (categoryId: BuildCategoryId) => void;
  busyLabel: string | null;
}

export function StartScreen({ prompt, onPromptChange, onSubmitPrompt, onSelectCategory, busyLabel }: StartScreenProps) {
  const busy = !!busyLabel;
  const submit = () => {
    if (prompt.trim() && !busy) onSubmitPrompt();
  };

  return (
    <Surface mode="default" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Container variant="full-bleed" layout="flex" direction="column" align="center" gap="6" style={{ width: '100%', maxWidth: 640, padding: '0 24px' }}>
        <Container variant="full-bleed" layout="flex" direction="column" align="center" gap="3">
          <BrandMark size={36} />
          <Text variant="display" size="M" textAlign="center">
            Reliance Builder
          </Text>
          <Text variant="body" size="M" appearance="neutral" textAlign="center">
            Build on-brand, ready-to-use ideas in seconds.
          </Text>
        </Container>

        <Container variant="full-bleed" layout="flex" gap="2" style={{ width: '100%' }}>
          <div style={{ flex: 1 }}>
            <Input
              size="l"
              placeholder="What would you like to build today?"
              value={prompt}
              onChange={onPromptChange}
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
            />
          </div>
          <Button attention="high" size="l" disabled={!prompt.trim() || busy} onClick={submit} loading={busy}>
            Build
          </Button>
        </Container>

        <Container variant="full-bleed" layout="flex" wrap justify="center" gap="2">
          {BUILD_CATEGORIES.map((category) => (
            <Chip
              key={category.id}
              size="m"
              attention="medium"
              disabled={busy}
              start={<Icon icon={CATEGORY_ICONS[category.id]} size="4" />}
              defaultSelected={false}
              onSelectedChange={() => !busy && onSelectCategory(category.id)}
            >
              {category.label}
            </Chip>
          ))}
        </Container>

        {busyLabel && (
          <Container variant="full-bleed" layout="flex" align="center" gap="2">
            <CircularProgressIndicator variant="indeterminate" size="XS" aria-label="Working" />
            <Text variant="label" size="S" appearance="neutral">
              {busyLabel}
            </Text>
          </Container>
        )}
      </Container>
    </Surface>
  );
}
