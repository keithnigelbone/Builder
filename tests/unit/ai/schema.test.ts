import { describe, expect, it } from 'vitest';
import { describeHeroImage } from '../../../App/src/ai/schema';

describe('describeHeroImage', () => {
  it('joins subject, action, and location when all are present', () => {
    expect(
      describeHeroImage({
        imageSubject: 'a solar technician',
        imageAction: 'adjusting a panel',
        imageLocation: 'a Rajasthan solar field',
      }),
    ).toBe('a solar technician, adjusting a panel, a Rajasthan solar field');
  });

  it('skips missing parts instead of leaving empty gaps', () => {
    expect(
      describeHeroImage({
        imageSubject: 'a solar technician',
        imageLocation: 'a Rajasthan solar field',
      }),
    ).toBe('a solar technician, a Rajasthan solar field');
  });

  it('falls back to the headline when no image parts are given', () => {
    expect(describeHeroImage({ headline: 'Power for every home' })).toBe('Power for every home');
  });

  it('falls back to a generic label when neither image parts nor headline are given', () => {
    expect(describeHeroImage({})).toBe('Generated preview image');
  });
});
