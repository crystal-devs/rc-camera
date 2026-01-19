import { Photo } from "@/types/PhotoGallery.types";

export function getPhotoDimensions(photo: Photo): { width: number; height: number } {
    // Try metadata first
    if (photo.metadata?.width && photo.metadata?.height) {
        return { width: photo.metadata.width, height: photo.metadata.height };
    }

    // Try parsing dimensions string "1920x1080"
    if (photo.dimensions) {
        const [w, h] = photo.dimensions.split('x').map(Number);
        if (!isNaN(w) && !isNaN(h)) return { width: w, height: h };
    }

    // Fallback (shouldn't happen for valid photos)
    return { width: 1, height: 1 };
}

export function ratio(photo: Photo) {
    const { width, height } = getPhotoDimensions(photo);
    return width / (height || 1);
}

export function round(value: number, decimals = 0) {
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
}
