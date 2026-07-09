import { describe, expect, it } from 'vitest';
import { CRITIQUE_TOOL, PLAN_TOOL } from '../../App/aiServerPlugin';

describe('PLAN_TOOL video fields', () => {
  const props = PLAN_TOOL.input_schema.properties as Record<string, any>;

  it('authors the storyboard content fields', () => {
    for (const key of ['recommendedDuration', 'openingShot', 'keyScenes', 'closingFrame', 'voiceoverCopy']) {
      expect(props[key], key).toBeDefined();
    }
    expect(props.keyScenes.type).toBe('array');
    expect(props.keyScenes.items.required).toEqual(['title', 'description']);
  });

  it('never lets the model author the format', () => {
    expect(props.videoFormat).toBeUndefined();
    expect(props.videoFormatId).toBeUndefined();
  });
});

describe('CRITIQUE_TOOL video fields', () => {
  const props = CRITIQUE_TOOL.input_schema.properties as Record<string, any>;

  it('can revise storyboard content but not the format', () => {
    expect(props.keyScenes).toBeDefined();
    expect(props.openingShot).toBeDefined();
    expect(props.videoFormat).toBeUndefined();
  });
});
