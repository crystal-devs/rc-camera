import findShortestPath from "./dijkstra";
import { ratio, round } from "./utils";
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

// guesstimate how many neighboring nodes should be searched based on
// the aspect ratio of the container with images and minimal aspect ratio of all photos
// as the maximum amount of photos per row, plus some nodes
function findIdealNodeSearch(photos: Photo[], containerWidth: number, targetRowHeight: number, minPhotos?: number) {
    return (
        round(containerWidth / targetRowHeight / Math.min(...photos.map((photo) => ratio(photo)))) + (minPhotos || 0) + 2
    );
}

// get the height for a set of photos in a potential row
function getCommonHeight(photos: Photo[], containerWidth: number, spacing: number, padding: number) {
    return (
        (containerWidth - (photos.length - 1) * spacing - 2 * padding * photos.length) /
        photos.reduce((acc, photo) => acc + ratio(photo), 0)
    );
}

// calculate the cost of breaking at this node (edge weight)
function cost(
    photos: Photo[],
    i: number,
    j: number,
    width: number,
    spacing: number,
    padding: number,
    targetRowHeight: number,
    isLastRow: boolean,
) {
    const row = photos.slice(i, j);
    const commonHeight = getCommonHeight(row, width, spacing, padding);

    if (isLastRow) {
        // For the last row, we want to use target height, so penalize deviation from target
        return commonHeight > 0 ? (commonHeight - targetRowHeight) ** 2 * row.length : undefined;
    } else {
        // For other rows, penalize deviation from target for justification
        return commonHeight > 0 ? (commonHeight - targetRowHeight) ** 2 * row.length : undefined;
    }
}

// return function that gets the neighboring nodes of node and returns costs
function makeGetRowNeighbors(
    photos: Photo[],
    spacing: number,
    padding: number,
    containerWidth: number,
    targetRowHeight: number,
    limitNodeSearch: number,
    minPhotos?: number,
    maxPhotos?: number,
) {
    return (node: number) => {
        const results = new Map<number, number>();
        results.set(node, 0);
        const startOffset = minPhotos || 1;
        const endOffset = Math.min(limitNodeSearch, maxPhotos || Infinity);
        for (let i = node + startOffset; i < photos.length + 1; i += 1) {
            if (i - node > endOffset) break;
            const isLastRow = i === photos.length;
            const currentCost = cost(photos, node, i, containerWidth, spacing, padding, targetRowHeight, isLastRow);
            if (currentCost === undefined) break;
            results.set(i, currentCost);
        }
        return results;
    };
}

// Justified rows layout with adjusted heights for non-last rows, uniform height for all
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
            width: commonHeight * ratio(photo),
            height: commonHeight,
        }));

        tracks.push({ photos: photosInRow });
    }

    return { spacing, padding, containerWidth, tracks, horizontal: true };
}
