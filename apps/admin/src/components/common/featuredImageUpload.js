// Rules for uploading a featured image from the user's computer (the "Set featured image" popup).
// The upload goes through the same pipeline as the Media library, so the file is also added to Media.

export const ALSO_IN_MEDIA_NOTE = 'This image will also be added to Media.';
export const FEATURED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const FEATURED_IMAGE_ACCEPT = FEATURED_IMAGE_TYPES.join(',');
export const FEATURED_IMAGE_HINT = 'JPG, PNG, GIF or WebP';

export const isAcceptedFeaturedImage = (mimeType) => FEATURED_IMAGE_TYPES.includes(String(mimeType || '').toLowerCase());

/** The popup's size: the design size on a big screen, never wider or taller than the window. */
export const featuredPopupSize = (viewportWidth, viewportHeight) => ({
  width: viewportWidth < 768 ? Math.round(viewportWidth * 0.95) : Math.min(1200, Math.round(viewportWidth * 0.95)),
  height: viewportWidth < 768 ? Math.round(viewportHeight * 0.9) : Math.min(800, Math.round(viewportHeight * 0.9)),
});
