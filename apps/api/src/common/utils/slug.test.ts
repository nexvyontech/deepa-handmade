import { SLUG_PATTERN, toSlug } from './slug.js';

describe('toSlug', () => {
  it('slugs an English name', () => {
    expect(toSlug('Handmade Brass Diya')).toBe('handmade-brass-diya');
  });

  it('collapses punctuation and whitespace runs', () => {
    expect(toSlug('  Brass  Diya — Colour  (Gold)  ')).toBe('brass-diya-colour-gold');
  });

  it('strips diacritics', () => {
    expect(toSlug('Dîya Dèep')).toBe('diya-deep');
  });

  it('returns an empty string for non-Latin-only input', () => {
    expect(toSlug('வெண்கல விளக்கு')).toBe('');
  });

  it('minifies uppercase', () => {
    expect(toSlug('BIG Brass')).toBe('big-brass');
  });
});

describe('SLUG_PATTERN', () => {
  it('accepts lowercase slug shapes', () => {
    expect(SLUG_PATTERN.test('handmade')).toBe(true);
    expect(SLUG_PATTERN.test('handmade-brass-diya')).toBe(true);
    expect(SLUG_PATTERN.test('a-1-b')).toBe(true);
  });

  it('rejects uppercase, underscores, leading/trailing hyphens and repeated hyphens', () => {
    expect(SLUG_PATTERN.test('Handmade')).toBe(false);
    expect(SLUG_PATTERN.test('handmade_brass')).toBe(false);
    expect(SLUG_PATTERN.test('-handmade')).toBe(false);
    expect(SLUG_PATTERN.test('handmade-')).toBe(false);
    expect(SLUG_PATTERN.test('handmade--brass')).toBe(false);
    expect(SLUG_PATTERN.test('handmade brass')).toBe(false);
  });
});