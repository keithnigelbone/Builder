import { describe, expect, it } from 'vitest';
import { BUILD_CATEGORIES, getBuildCategory } from '../../../App/src/data/buildCategories';

describe('BUILD_CATEGORIES', () => {
  it('gives every category exactly two guided questions', () => {
    for (const category of BUILD_CATEGORIES) {
      expect(category.questions).toHaveLength(2);
      for (const question of category.questions) {
        expect(question.options.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('has unique category ids', () => {
    const ids = BUILD_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getBuildCategory', () => {
  it('finds a category by id', () => {
    expect(getBuildCategory('motion')?.label).toBe('Motion');
  });

  it('returns undefined for an unknown id', () => {
    expect(getBuildCategory('not-a-category')).toBeUndefined();
  });
});
