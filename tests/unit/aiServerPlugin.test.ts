import { describe, expect, it } from 'vitest';
import { PLAN_TOOL } from '../../App/aiServerPlugin';

describe('PLAN_TOOL schema', () => {
  it('includes the website quote, newsItems, and contactHeadline fields', () => {
    const props = PLAN_TOOL.input_schema.properties;

    expect(props.quote).toBeDefined();
    expect(props.quote.properties).toEqual(
      expect.objectContaining({
        text: { type: 'string' },
        name: { type: 'string' },
        title: { type: 'string' },
      }),
    );

    expect(props.newsItems).toBeDefined();
    expect(props.newsItems.type).toBe('array');

    expect(props.contactHeadline).toBeDefined();
    expect(props.contactHeadline.type).toBe('string');
  });
});
