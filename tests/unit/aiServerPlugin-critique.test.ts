import { describe, expect, it } from 'vitest';
import { CRITIQUE_TOOL, PLAN_TOOL } from '../../App/aiServerPlugin';
import { getPatternsForCategory } from '../../App/src/data/patternRegistry';

describe('PLAN_TOOL patternId', () => {
  it('offers exactly the website and app-screens pattern ids', () => {
    const expected = [...getPatternsForCategory('website'), ...getPatternsForCategory('app-screens')].map((p) => p.id);
    expect(PLAN_TOOL.input_schema.properties.patternId.enum).toEqual(expected);
  });
});

describe('CRITIQUE_TOOL', () => {
  const props = CRITIQUE_TOOL.input_schema.properties as Record<string, unknown>;

  it('can revise content fields', () => {
    for (const key of ['headline', 'subheadline', 'body', 'ctaLabel', 'sections', 'slides', 'imageLocation']) {
      expect(props[key], `${key} should be revisable`).toBeDefined();
    }
  });

  it('cannot touch structural fields', () => {
    for (const key of ['patternId', 'dimensionVariant', 'recommendedComponentNames', 'socialFormat', 'motionConcept', 'reasoning']) {
      expect(props[key], `${key} must not be revisable`).toBeUndefined();
    }
  });

  it('requires only qualityNotes', () => {
    expect(CRITIQUE_TOOL.input_schema.required).toEqual(['qualityNotes']);
    expect(props.qualityNotes).toBeDefined();
  });
});
