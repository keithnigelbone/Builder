import type { BuildPlan } from '../../ai/schema';
import { resolvePatternId } from '../../data/patternRegistry';
import { ProductStory } from './website/ProductStory';
import { CampaignHero } from './website/CampaignHero';
import { Editorial } from './website/Editorial';
import { ServiceHub } from './website/ServiceHub';

/**
 * Website preview = a switch over the curated pattern registry. The pattern
 * id is always resolved through the registry (invalid/missing → the
 * category default), so Claude can steer the layout but never invent one.
 */
export function WebsitePreview({ plan }: { plan: BuildPlan }) {
  switch (resolvePatternId('website', plan)) {
    case 'campaign-hero':
      return <CampaignHero plan={plan} />;
    case 'editorial':
      return <Editorial plan={plan} />;
    case 'service-hub':
      return <ServiceHub plan={plan} />;
    case 'product-story':
    default:
      return <ProductStory plan={plan} />;
  }
}
