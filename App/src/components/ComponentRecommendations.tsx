import { Container, Surface, Text, Badge } from '@jds4/oneui-react';
import type { RecommendedComponent } from '../data/componentRecommendations';

export function ComponentRecommendations({ components }: { components: RecommendedComponent[] }) {
  return (
    <Container variant="full-bleed" layout="flex" direction="column" gap="3" width="full">
      <Text variant="label" size="S" appearance="neutral">
        Recommended components
      </Text>
      <Container variant="full-bleed" layout="grid" columns={2} gap="2" width="full">
        {components.map(({ meta, reason }) => (
          <Surface
            key={meta.name}
            mode="subtle"
            style={{ padding: 'var(--Spacing-3)', borderRadius: 'var(--Shape-2)', width: '100%', boxSizing: 'border-box' }}
          >
            <Container variant="full-bleed" layout="flex" direction="column" gap="1" width="full">
              <Container variant="full-bleed" layout="flex" align="center" justify="space-between" width="full">
                <Text variant="body" size="M" weight="high">
                  {meta.displayName}
                </Text>
                <Badge size="xs" attention="low" appearance="neutral">
                  {meta.category}
                </Badge>
              </Container>
              <Text variant="body" size="S" appearance="neutral" maxLines={2}>
                {meta.description}
              </Text>
              <Text variant="label" size="XS" appearance="primary">
                {reason}
              </Text>
            </Container>
          </Surface>
        ))}
      </Container>
    </Container>
  );
}
