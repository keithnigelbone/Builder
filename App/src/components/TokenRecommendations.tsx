import { Container, Surface, Text } from '@jds4/oneui-react';
import { TOKEN_CATEGORY_ORDER, type TokenCategory, type TokenSample } from '../data/tokenRecommendations';

const CATEGORY_LABEL: Record<TokenCategory, string> = {
  color: 'Colour',
  typography: 'Typography',
  spacing: 'Spacing',
  shape: 'Radius / shape',
  stroke: 'Stroke',
  elevation: 'Elevation',
  motion: 'Motion',
  decoration: 'Decoration',
  accessibility: 'Accessibility',
};

export function TokenRecommendations({ tokensByCategory }: { tokensByCategory: Partial<Record<TokenCategory, TokenSample[]>> }) {
  const categories = TOKEN_CATEGORY_ORDER.filter((category) => tokensByCategory[category]?.length);

  return (
    <Container variant="full-bleed" layout="flex" direction="column" gap="3" width="full">
      <Text variant="label" size="S" appearance="neutral">
        Recommended tokens
      </Text>
      <Container variant="full-bleed" layout="flex" direction="column" gap="3" width="full">
        {categories.map((category) => (
          <Container variant="full-bleed" key={category} layout="flex" direction="column" gap="2" width="full">
            <Text variant="label" size="XS" appearance="neutral">
              {CATEGORY_LABEL[category]}
            </Text>
            <Container variant="full-bleed" layout="flex" wrap gap="2">
              {tokensByCategory[category]!.map((token) => (
                <TokenChip key={`${category}-${token.defaultToken}`} category={category} token={token} />
              ))}
            </Container>
          </Container>
        ))}
      </Container>
    </Container>
  );
}

function TokenChip({ category, token }: { category: TokenCategory; token: TokenSample }) {
  const isColor = category === 'color';
  const title = token.isRelianceSpecific
    ? `Reliance-defined value.${token.description ? ' ' + token.description : ''}`
    : `No Reliance override for this one — using the shared design-system default.${token.description ? ' ' + token.description : ''}`;
  return (
    <Surface
      mode="minimal"
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--Spacing-1-5)',
        padding: 'var(--Spacing-1-5) var(--Spacing-2)',
        borderRadius: 'var(--Shape-Pill)',
        opacity: token.isRelianceSpecific ? 1 : 0.6,
      }}
    >
      {isColor && (
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            background: `var(--${token.defaultToken})`,
            border: '1px solid var(--Neutral-Stroke-Low)',
          }}
        />
      )}
      <Text variant="label" size="XS">
        {token.defaultToken}
      </Text>
      {!token.isRelianceSpecific && (
        <Text variant="label" size="XS" appearance="neutral">
          (shared)
        </Text>
      )}
    </Surface>
  );
}
