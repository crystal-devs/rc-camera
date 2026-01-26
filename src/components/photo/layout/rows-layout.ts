import { ratio } from "./utils";
import { Photo } from "@/types/PhotoGallery.types";

export interface LayoutTrack {
    photos: {
        photo: Photo;
        index: number;
        width: number;
        height: number;
    }[];
}

export interface LayoutModel {
    spacing: number;
    padding: number;
    containerWidth: number;
    tracks: LayoutTrack[];
    horizontal: boolean;
}

// Justified rows layout with greedy approach
export default function computeRowsLayout(
    photos: Photo[],
    spacing: number,
    padding: number,
    containerWidth: number,
    targetRowHeight: number,
    minPhotos?: number,
    maxPhotos?: number,
): LayoutModel | undefined {
    const tracks: LayoutTrack[] = [];
    let currentIndex = 0;
    let commonHeight = targetRowHeight; // Will be updated with the last justified row's height

    // First pass: determine row breaks and calculate heights
    const rowData: { photos: Photo[]; startIndex: number; isLast: boolean; height: number }[] = [];

    while (currentIndex < photos.length) {
        const rowPhotos: Photo[] = [];
        let i = currentIndex;

        // Greedily add photos until we can't fit more
        for (; i < photos.length; i++) {
            const testRow = [...rowPhotos, photos[i]];
            const totalSpacing = testRow.length > 1 ? (testRow.length - 1) * spacing : 0;
            const totalAspectRatio = testRow.reduce((sum, photo) => sum + ratio(photo), 0);
            const requiredWidth = totalAspectRatio * targetRowHeight + totalSpacing;

            // If this row would exceed container width, don't add the current photo
            if (requiredWidth > containerWidth && rowPhotos.length > 0) {
                break;
            }

            rowPhotos.push(photos[i]);
        }

        // If no photos were added (edge case), force add at least one
        if (rowPhotos.length === 0) {
            rowPhotos.push(photos[currentIndex]);
            i = currentIndex + 1;
        }

        const isLast = i >= photos.length;
        let rowHeight = targetRowHeight;

        if (!isLast) {
            // Calculate height to fill container width for justified rows
            const totalSpacing = rowPhotos.length > 1 ? (rowPhotos.length - 1) * spacing : 0;
            const totalAspectRatio = rowPhotos.reduce((sum, photo) => sum + ratio(photo), 0);
            rowHeight = (containerWidth - totalSpacing) / totalAspectRatio;
            commonHeight = rowHeight; // Update common height with the last justified row's height
        }

        rowData.push({ photos: rowPhotos, startIndex: currentIndex, isLast, height: rowHeight });
        currentIndex = i;
    }

    // Second pass: apply common height to all rows
    for (const row of rowData) {
        const photosInRow = row.photos.map((photo, idx) => ({
            photo,
            index: row.startIndex + idx,
            width: row.height * ratio(photo),
            height: row.height,
        }));

        tracks.push({ photos: photosInRow });
    }

    return { spacing, padding, containerWidth, tracks, horizontal: true };
}
