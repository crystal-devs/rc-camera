import { ResponsiveUrls } from '@/utils/imageSrcset';

/**
 * Minimal shape the gallery engine needs from a media item.
 * Both `Photo` (admin) and `TransformedPhoto` (guest) satisfy it structurally,
 * so the engine works on either without mapping/copying arrays.
 */
export interface GalleryMedia {
  id: string;
  type?: string; // 'image' | 'video'
  width?: number;
  height?: number;
  responsive_urls?: ResponsiveUrls | null;
  /** Fallback URLs — at least one of these exists on every media shape. */
  src?: string;
  imageUrl?: string;
  metadata?: { width?: number; height?: number };
  /** Parsed by some legacy items, e.g. "1920x1080". */
  dimensions?: string | { width?: number; height?: number } | null;
}

export interface PositionedItem<T extends GalleryMedia> {
  item: T;
  /** Index in the original items array (stable for onPhotoClick etc.). */
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GalleryLayout<T extends GalleryMedia> {
  items: PositionedItem<T>[];
  totalHeight: number;
}

/** Best-effort aspect ratio (w/h) with a sane clamp so one bad EXIF value can't blow up a row. */
export function mediaAspectRatio(media: GalleryMedia): number {
  let w = media.width || media.metadata?.width;
  let h = media.height || media.metadata?.height;

  if ((!w || !h) && typeof media.dimensions === 'string') {
    const [dw, dh] = media.dimensions.split('x').map(Number);
    if (!isNaN(dw) && !isNaN(dh)) {
      w = dw;
      h = dh;
    }
  } else if ((!w || !h) && media.dimensions && typeof media.dimensions === 'object') {
    w = w || media.dimensions.width;
    h = h || media.dimensions.height;
  }

  if (!w || !h || w <= 0 || h <= 0) return 1; // square fallback, never random
  return Math.min(Math.max(w / h, 0.4), 2.5);
}

export function mediaFallbackSrc(media: GalleryMedia): string | undefined {
  return (
    media.responsive_urls?.display ||
    media.responsive_urls?.thumbnail ||
    media.src ||
    media.imageUrl ||
    undefined
  );
}
