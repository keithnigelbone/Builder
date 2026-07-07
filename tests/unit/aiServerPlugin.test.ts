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

describe('PLAN_TOOL schema — app screens', () => {
  it('includes typed contentBlocks and screenNavItems with a validated icon enum', () => {
    const props = PLAN_TOOL.input_schema.properties;

    expect(props.contentBlocks.type).toBe('array');
    expect(props.contentBlocks.items.properties.type.enum).toEqual(['list-item', 'stat', 'image-card', 'action']);
    expect(props.contentBlocks.items.properties.icon.enum).toContain('home');

    expect(props.screenNavItems).toBeDefined();
    expect(props.screenNavItems.type).toBe('array');
    expect(props.screenNavItems.items.properties.icon.enum).toContain('home');
    expect(props.screenNavItems.items.required).toEqual(['label', 'icon']);
  });
});

describe('PLAN_TOOL schema — slides', () => {
  it('includes a slides array with a validated slideType enum', () => {
    const props = PLAN_TOOL.input_schema.properties;

    expect(props.slides.type).toBe('array');
    expect(props.slides.items.properties.slideType.enum).toEqual(['cover', 'divider', 'content', 'split-photo', 'table']);
    expect(props.slides.items.required).toEqual(['slideType', 'headline']);
    expect(props.slides.items.properties.tableColumns.items.required).toEqual(['header', 'items']);
  });
});
