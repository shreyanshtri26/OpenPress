import { describe, expect, it } from 'vitest';
import { ALSO_IN_MEDIA_NOTE, FEATURED_IMAGE_ACCEPT, featuredPopupSize, isAcceptedFeaturedImage } from '../featuredImageUpload';

describe('featured image upload rules', () => {
  it('accepts the image formats a featured image can use, and nothing else', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'IMAGE/PNG']) expect(isAcceptedFeaturedImage(type)).toBe(true);
    for (const type of ['image/svg+xml', 'image/bmp', 'video/mp4', 'audio/mpeg', 'application/pdf', '', undefined, null]) expect(isAcceptedFeaturedImage(type)).toBe(false);
  });

  it('gives the file chooser the same list', () => {
    expect(FEATURED_IMAGE_ACCEPT.split(',').sort()).toEqual(['image/gif', 'image/jpeg', 'image/png', 'image/webp']);
  });

  it('tells the user the image also goes to Media', () => {
    expect(ALSO_IN_MEDIA_NOTE).toMatch(/also be added to Media/i);
  });

  it('keeps the popup inside the window but at the design size on a big screen', () => {
    expect(featuredPopupSize(1920, 1080)).toEqual({ width: 1200, height: 800 });
    expect(featuredPopupSize(1000, 700)).toEqual({ width: 950, height: 630 });
    expect(featuredPopupSize(800, 600)).toEqual({ width: 760, height: 540 });
    expect(featuredPopupSize(390, 800)).toEqual({ width: 371, height: 720 });
    for (const [w, h] of [[800, 600], [1000, 700], [1280, 720], [390, 800]]) {
      const s = featuredPopupSize(w, h);
      expect(s.width).toBeLessThanOrEqual(w);
      expect(s.height).toBeLessThanOrEqual(h);
    }
  });
});
