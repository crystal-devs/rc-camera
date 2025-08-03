import { ApiPhoto, TransformedPhoto } from "@/types/events";

export const extractThumbnailUrl = (mediaItem: ApiPhoto): string => {
  // Priority order for thumbnail URLs (smallest first)
  const thumbnailSources = [
    mediaItem.responsive_urls?.thumbnail,
    mediaItem.image_variants?.small?.webp?.url,
    mediaItem.image_variants?.small?.jpeg?.url,
    mediaItem.thumbnail_url,
    mediaItem.thumbnail,
    // Fallback: create thumbnail from original if it's ImageKit
    (mediaItem.url?.includes('ik.imagekit.io') 
      ? `${mediaItem.url}?tr=w-400,h-600,c-maintain_ratio,f-auto,q-80`
      : null),
    mediaItem.imageUrl,
    mediaItem.url
  ];

  const thumbnailUrl = thumbnailSources.find(url => url && typeof url === 'string');
  
  if (!thumbnailUrl) {
    console.warn('No thumbnail URL found for media item:', mediaItem._id);
    return mediaItem.url || '';
  }

  // Log optimization status
  const isOptimized = thumbnailUrl !== mediaItem.url && 
                     (thumbnailUrl.includes('thumbnail') || 
                      thumbnailUrl.includes('small') || 
                      thumbnailUrl.includes('tr=w-'));
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`🖼️ ${mediaItem._id}: ${isOptimized ? '✅ Optimized' : '⚠️ Original'} - ${thumbnailUrl}`);
  }

  return thumbnailUrl;
};

export const extractOriginalUrl = (mediaItem: ApiPhoto): string => {
  return mediaItem.responsive_urls?.original || 
         mediaItem.url || 
         mediaItem.imageUrl ||
         mediaItem.image_variants?.original?.url ||
         '';
};

export const createProgressiveUrls = (mediaItem: ApiPhoto) => {
  const thumbnail = extractThumbnailUrl(mediaItem);
  const original = extractOriginalUrl(mediaItem);
  
  return {
    placeholder: thumbnail, // Use thumbnail as placeholder
    thumbnail: thumbnail,   // For grid display
    display: mediaItem.responsive_urls?.medium || thumbnail,
    full: mediaItem.responsive_urls?.large || original,
    original: original
  };
};

// FIXED transformApiPhoto function
export const transformApiPhoto = (apiPhoto: ApiPhoto): TransformedPhoto => {
  const progressiveUrls = createProgressiveUrls(apiPhoto);
  const thumbnailUrl = extractThumbnailUrl(apiPhoto);
  const originalUrl = extractOriginalUrl(apiPhoto);

  return {
    id: apiPhoto._id,
    src: thumbnailUrl, // Use thumbnail for grid display
    originalSrc: originalUrl, // Keep original for downloads
    width: apiPhoto.dimensions?.width || apiPhoto.metadata?.width || 400,
    height: apiPhoto.dimensions?.height || apiPhoto.metadata?.height || 600,
    uploaded_by: "Guest",
    approval: apiPhoto.approval,
    createdAt: apiPhoto.createdAt,
    albumId: apiPhoto.albumId,
    eventId: apiPhoto.eventId,
    progressiveUrls,
    loadPriority: 'normal',
    batchIndex: 0
  };
};