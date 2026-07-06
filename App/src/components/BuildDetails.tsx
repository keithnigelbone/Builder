import { Container, Text, Icon, Badge } from '@jds4/oneui-react';
import type { RecommendedComponent } from '../data/componentRecommendations';
import type { TokenCategory, TokenSample } from '../data/tokenRecommendations';
import type { BuildRequest } from '../types';
import { ComponentRecommendations } from './ComponentRecommendations';
import { TokenRecommendations } from './TokenRecommendations';

interface BuildDetailsProps {
  components: RecommendedComponent[];
  tokensByCategory: Partial<Record<TokenCategory, TokenSample[]>>;
  request: BuildRequest;
}

/**
 * TEMPORARY FALLBACK: no OneUI disclosure/accordion component exists in the
 * registry, so this is a plain `<details>`/`<summary>` — native, accessible,
 * collapsed by default. It's the one place in this app that talks about
 * components, tokens, and the AI layer by name; everything outside it stays
 * in plain, end-user language on purpose.
 */
export function BuildDetails({ components, tokensByCategory, request }: BuildDetailsProps) {
  return (
    <details style={{ width: '100%' }}>
      <summary
        style={{
          cursor: 'pointer',
          listStyle: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--Spacing-1)',
        }}
      >
        <Container variant="full-bleed" layout="flex" align="center" gap="1">
          <Icon icon="chevronRight" size="4" className="build-details-chevron" />
          <Text variant="label" size="S" appearance="neutral">
            Build details
          </Text>
        </Container>
      </summary>
      <style>{`
        details[open] > summary .build-details-chevron { transform: rotate(90deg); }
        summary::-webkit-details-marker { display: none; }
      `}</style>

      <Container variant="full-bleed" layout="flex" direction="column" gap="4" width="full" style={{ marginTop: 'var(--Spacing-3)' }}>
        <AIReasoningSummary request={request} />
        <Container variant="full-bleed" layout="grid" columns={2} gap="6" width="full">
          <ComponentRecommendations components={components} />
          <TokenRecommendations tokensByCategory={tokensByCategory} />
        </Container>
      </Container>
    </details>
  );
}

function AIReasoningSummary({ request }: { request: BuildRequest }) {
  const { classifyMeta, planMeta } = request;
  const fallbacks = [
    classifyMeta.source === 'fallback' ? { stage: 'Understanding your request', reason: classifyMeta.fallbackReason } : null,
    planMeta.source === 'fallback' ? { stage: 'Designing the preview', reason: planMeta.fallbackReason } : null,
  ].filter((f): f is { stage: string; reason: string | undefined } => f !== null);

  return (
    <Container variant="full-bleed" layout="flex" direction="column" gap="3" width="full">
      <Text variant="label" size="S" appearance="neutral">
        What Claude understood
      </Text>
      <Container variant="full-bleed" layout="flex" direction="column" gap="2" width="full">
        <ReasoningRow label="Understanding your request" meta={classifyMeta} />
        <ReasoningRow label="Designing the preview" meta={planMeta} />
      </Container>

      {fallbacks.length > 0 && (
        <Container variant="full-bleed" layout="flex" direction="column" gap="1" width="full">
          <Text variant="label" size="XS" appearance="negative">
            Fallbacks used
          </Text>
          {fallbacks.map((f) => (
            <Text key={f.stage} variant="body" size="S" appearance="neutral">
              {f.stage}: {f.reason || 'Claude was unavailable — used built-in reasoning instead.'}
            </Text>
          ))}
        </Container>
      )}
    </Container>
  );
}

function ReasoningRow({ label, meta }: { label: string; meta: BuildRequest['classifyMeta'] }) {
  return (
    <Container variant="full-bleed" layout="flex" direction="column" gap="1" width="full">
      <Container variant="full-bleed" layout="flex" align="center" gap="2">
        <Text variant="label" size="XS" weight="high">
          {label}
        </Text>
        <Badge size="xs" appearance={meta.source === 'claude' ? 'positive' : 'warning'}>
          {meta.source === 'claude' ? 'Claude' : 'Fallback'}
        </Badge>
      </Container>
      <Text variant="body" size="S" appearance="neutral">
        {meta.reasoning}
      </Text>
    </Container>
  );
}
