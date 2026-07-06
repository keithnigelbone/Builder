import { useMemo } from 'react';
import { Container, Surface, Text, Button, Divider, Chip, CircularProgressIndicator } from '@jds4/oneui-react';
import type { BuildRequest } from '../types';
import { recommendComponents } from '../data/componentRecommendations';
import { collectTokensByCategory } from '../data/tokenRecommendations';
import { BuildPreview } from './BuildPreview';
import { RefinePrompt } from './RefinePrompt';
import { BuildDetails } from './BuildDetails';

interface ResultScreenProps {
  request: BuildRequest;
  busyLabel: string | null;
  onRefine: (note: string) => void;
  onStartOver: () => void;
}

export function ResultScreen({ request, busyLabel, onRefine, onStartOver }: ResultScreenProps) {
  const { category, answers, plan, refinements } = request;

  // Derived, not stored: recomputing from the real registry keeps this in
  // sync if answers change, and avoids caching stale recommendations. If
  // the AI picked specific components, those win; otherwise fall back to
  // our own category-based recommendation logic.
  const recommendedComponents = useMemo(() => recommendComponents(category.id, answers), [category.id, answers]);
  const tokensByCategory = useMemo(() => collectTokensByCategory(recommendedComponents), [recommendedComponents]);

  return (
    <Surface mode="default" style={{ minHeight: '100vh', padding: '48px 24px' }}>
      <Container variant="full-bleed" layout="flex" direction="column" gap="6" width="full" style={{ maxWidth: 880, margin: '0 auto' }}>
        <Container variant="full-bleed" layout="flex" align="center" justify="space-between">
          <Container variant="full-bleed" layout="flex" direction="column" gap="1">
            <Text variant="label" size="S" appearance="primary">
              {category.label}
            </Text>
            <Text variant="title" size="L">
              Here's what we'd build
            </Text>
          </Container>
          <Button attention="low" onClick={onStartOver}>
            Start over
          </Button>
        </Container>

        <RequestSummary request={request} />

        <Divider />

        <Container variant="full-bleed" layout="flex" direction="column" gap="2" width="full">
          <BuildPreview category={category.id} answers={answers} plan={plan} />
          {busyLabel && (
            <Container variant="full-bleed" layout="flex" align="center" gap="2">
              <CircularProgressIndicator variant="indeterminate" size="XS" aria-label="Working" />
              <Text variant="label" size="S" appearance="neutral">
                {busyLabel}
              </Text>
            </Container>
          )}
        </Container>

        <Divider />

        <RefinePrompt refinements={refinements} onAddRefinement={onRefine} disabled={!!busyLabel} />

        <Divider />

        <BuildDetails components={recommendedComponents} tokensByCategory={tokensByCategory} request={request} />
      </Container>
    </Surface>
  );
}

function RequestSummary({ request }: { request: BuildRequest }) {
  const { freeformPrompt, answerLabels } = request;
  return (
    <Container variant="full-bleed" layout="flex" direction="column" gap="2">
      <Text variant="label" size="S" appearance="neutral">
        Request summary
      </Text>
      {freeformPrompt && (
        <Text variant="body" size="M">
          “{freeformPrompt}”
        </Text>
      )}
      <Container variant="full-bleed" layout="flex" wrap gap="2">
        {Object.entries(answerLabels).map(([questionId, label]) => (
          <Chip key={questionId} size="s" attention="low" appearance="neutral">
            {label}
          </Chip>
        ))}
      </Container>
    </Container>
  );
}
