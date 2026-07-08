import { describe, expect, it } from 'vitest';
import { SCENE_TEMPLATES, pickSceneTemplate, type SceneCategory } from '../../../App/src/data/sceneTemplates';

const CATEGORIES = Object.keys(SCENE_TEMPLATES) as SceneCategory[];

/** From App/src/ai/artDirection.ts's "Never use" list + the TATA prohibition. */
const BANNED = [
  'dramatic lighting',
  'beautiful',
  'professional photography',
  'realistic',
  'stunning',
  'perfect',
  'amazing',
  'high quality',
  'in india',
  'indian setting',
  'typical',
  'tata',
];

describe('scene template compliance', () => {
  it('covers exactly the four media categories, three-plus scenes each', () => {
    expect(CATEGORIES.sort()).toEqual(['app-screens', 'motion', 'social-media', 'website']);
    for (const category of CATEGORIES) {
      expect(SCENE_TEMPLATES[category].length, `${category} needs >= 3 scenes`).toBeGreaterThanOrEqual(3);
    }
  });

  it('every scene has the four art-directed fields, populated', () => {
    for (const category of CATEGORIES) {
      for (const scene of SCENE_TEMPLATES[category]) {
        expect(scene.imageSubject.length).toBeGreaterThan(10);
        expect(scene.imageAction.length).toBeGreaterThan(10);
        expect(scene.imageLocation.length).toBeGreaterThan(10);
        expect(scene.imageFraming.length).toBeGreaterThan(5);
      }
    }
  });

  it('no scene uses a banned phrase in any field', () => {
    for (const category of CATEGORIES) {
      for (const scene of SCENE_TEMPLATES[category]) {
        const text = Object.values(scene).filter((v): v is string => typeof v === 'string').join(' ').toLowerCase();
        for (const phrase of BANNED) {
          expect(text, `${category} scene "${scene.imageSubject.slice(0, 30)}…" contains banned "${phrase}"`).not.toContain(phrase);
        }
      }
    }
  });

  it('aerial scenes carry colour notes for the aerial baseline', () => {
    for (const category of CATEGORIES) {
      for (const scene of SCENE_TEMPLATES[category]) {
        if (scene.imageIsAerial) expect(scene.imageColourNotes, `${category} aerial scene needs imageColourNotes`).toBeTruthy();
      }
    }
  });
});

describe('pickSceneTemplate', () => {
  it('is stable for the same seed', () => {
    expect(pickSceneTemplate('website', 'solar campaign page')).toBe(pickSceneTemplate('website', 'solar campaign page'));
  });

  it('reaches more than one template across seeds', () => {
    const picked = new Set(
      ['a', 'solar page', 'retail app', 'festival post', 'city launch', 'grid story'].map((seed) => pickSceneTemplate('website', seed)),
    );
    expect(picked.size).toBeGreaterThan(1);
  });
});
