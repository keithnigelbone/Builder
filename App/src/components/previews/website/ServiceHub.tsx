import { Container, Text, Button, Surface, Icon } from '@jds4/oneui-react';
import type { BuildPlan } from '../../../ai/schema';
import { SiteHeader, SiteFooter } from './shared';

/** Icons cycled across service cards — a fixed, on-registry set (never model-chosen). */
const SERVICE_ICONS = ['grid', 'heart', 'settings', 'chat', 'calendar', 'search'];

/** "Service hub": one card per offering, each with its own low-attention CTA — the page CTA hierarchy stays with the header/hero. */
export function ServiceHub({ plan }: { plan: BuildPlan }) {
  const sections = plan.sections ?? [];

  return (
    <Container variant="full-bleed" layout="flex" direction="column" gap="0" width="full" style={{ minHeight: '100%' }}>
      <SiteHeader plan={plan} />

      <Container variant="full-bleed" layout="flex" direction="column" align="center" gap="3" padding="10">
        {plan.kicker && (
          <Text variant="label" size="S" appearance="primary">
            {plan.kicker}
          </Text>
        )}
        <Text variant="display" size="L" textAlign="center" style={{ maxWidth: 760 }}>
          {plan.headline}
        </Text>
        {plan.subheadline && (
          <Text variant="body" size="L" appearance="neutral" textAlign="center" style={{ maxWidth: 620 }}>
            {plan.subheadline}
          </Text>
        )}
      </Container>

      {sections.length > 0 && (
        <Container variant="full-bleed" layout="grid" columns={Math.min(Math.max(sections.length, 2), 3)} gap="6" width="full" padding="10" style={{ paddingTop: 0 }}>
          {sections.map((section, i) => (
            <Surface key={section.title} mode="subtle" style={{ padding: 'var(--Spacing-6)', borderRadius: 'var(--Shape-3)' }}>
              <Container variant="full-bleed" layout="flex" direction="column" gap="3" width="full">
                <Icon icon={SERVICE_ICONS[i % SERVICE_ICONS.length]} size="6" />
                <Text variant="title" size="M">
                  {section.title}
                </Text>
                <Text variant="body" size="M" appearance="neutral">
                  {section.body}
                </Text>
                <Button attention="low" size="m">
                  Explore
                </Button>
              </Container>
            </Surface>
          ))}
        </Container>
      )}

      {plan.contactHeadline && (
        <Surface mode="moderate" style={{ padding: 'var(--Spacing-10)', textAlign: 'center' }}>
          <Text variant="display" size="M">
            {plan.contactHeadline}
          </Text>
        </Surface>
      )}

      <SiteFooter plan={plan} />
    </Container>
  );
}
