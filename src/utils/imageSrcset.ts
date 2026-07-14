/**
 * Shared srcset/sizes helpers for gallery images.
 *
 * Every place that renders or preloads a grid image must build its srcset and
 * sizes through these helpers so the browser resolves the SAME variant URL in
 * both cases (a preloaded thumbnail is wasted bandwidth if the rendered <img>
 * then picks the display variant).
 *
 * Width descriptors match the backend variant tiers (variants.images
 * small/medium/large → responsive_urls thumbnail/display/full). When the API
 * starts returning real per-variant widths, thread them through here.
 */

export interface ResponsiveUrls {
  thumbnail?: string | null;
  display?: string | null;
  full?: string | null;
  original?: string | null;
}

export const VARIANT_WIDTHS = {
  thumbnail: 400,
  display: 1080,
  full: 1920,
} as const;

/** Default sizes for grids where the exact tile width is unknown. */
export const DEFAULT_GRID_SIZES =
  '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw';

export function buildGridSrcSet(urls?: ResponsiveUrls | null): string | undefined {
  if (!urls) return undefined;
  const candidates = [
    urls.thumbnail ? `${urls.thumbnail} ${VARIANT_WIDTHS.thumbnail}w` : null,
    urls.display ? `${urls.display} ${VARIANT_WIDTHS.display}w` : null,
    urls.full ? `${urls.full} ${VARIANT_WIDTHS.full}w` : null,
  ].filter(Boolean);
  return candidates.length > 0 ? candidates.join(', ') : undefined;
}

/**
 * Exact-width sizes attribute. When the layout already knows the rendered
 * tile width (masonry/rows layouts do), an exact px value lets the browser
 * pick the smallest sufficient variant instead of guessing from viewport.
 */
export function buildSizes(displayWidth?: number): string {
  if (displayWidth && displayWidth > 0) {
    return `${Math.round(displayWidth)}px`;
  }
  return DEFAULT_GRID_SIZES;
}

const preloadedKeys = new Set<string>();

/**
 * Warm the browser cache for an image using the same srcset/sizes the
 * rendered <img> will use, so the browser resolves the identical variant URL.
 */
export function preloadImage(
  srcSet: string | undefined,
  sizes: string,
  fallbackSrc?: string | null
): void {
  const key = srcSet ? `${srcSet}|${sizes}` : fallbackSrc;
  if (!key || preloadedKeys.has(key)) return;
  preloadedKeys.add(key);

  const img = new Image();
  if (srcSet) {
    img.sizes = sizes;
    img.srcset = srcSet;
  }
  if (fallbackSrc) img.src = fallbackSrc;
  img.decode?.().catch(() => {
    // Decode failures (offline, aborted) are non-fatal for a cache warm-up.
  });
}
