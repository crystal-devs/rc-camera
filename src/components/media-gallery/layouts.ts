import { GalleryLayout, GalleryMedia, PositionedItem, mediaAspectRatio } from './types';

/**
 * Pure layout functions. Given items with known aspect ratios and a container
 * width, they return absolute positions for every item — the Pinterest/Gestalt
 * approach: layout is computed up front from metadata, never measured from
 * loaded images, so the grid is stable (no CLS) and virtualization is trivial.
 */

/** Shortest-column masonry (Pinterest). Items keep their aspect ratio at column width. */
export function computeMasonryLayout<T extends GalleryMedia>(
  items: T[],
  containerWidth: number,
  columns: number,
  gap: number
): GalleryLayout<T> {
  const columnWidth = (containerWidth - gap * (columns - 1)) / columns;
  const columnHeights = new Array(columns).fill(0);
  const positioned: PositionedItem<T>[] = [];

  items.forEach((item, index) => {
    const height = Math.round(columnWidth / mediaAspectRatio(item));
    let col = 0;
    for (let c = 1; c < columns; c++) {
      if (columnHeights[c] < columnHeights[col]) col = c;
    }

    positioned.push({
      item,
      index,
      x: Math.round(col * (columnWidth + gap)),
      y: Math.round(columnHeights[col]),
      width: Math.round(columnWidth),
      height,
    });
    columnHeights[col] += height + gap;
  });

  const totalHeight = Math.max(0, Math.max(...columnHeights, 0) - gap);
  return { items: positioned, totalHeight };
}

/** Greedy justified rows (Google Photos / Flickr). Rows fill the full width at ~targetRowHeight. */
export function computeJustifiedLayout<T extends GalleryMedia>(
  items: T[],
  containerWidth: number,
  targetRowHeight: number,
  gap: number
): GalleryLayout<T> {
  const positioned: PositionedItem<T>[] = [];
  let y = 0;
  let rowStart = 0;

  while (rowStart < items.length) {
    // Greedily take items until the row at target height would overflow.
    let rowEnd = rowStart;
    let ratioSum = 0;
    while (rowEnd < items.length) {
      const nextRatio = mediaAspectRatio(items[rowEnd]);
      const count = rowEnd - rowStart + 1;
      const widthAtTarget = (ratioSum + nextRatio) * targetRowHeight + gap * (count - 1);
      if (widthAtTarget > containerWidth && rowEnd > rowStart) break;
      ratioSum += nextRatio;
      rowEnd++;
    }

    const count = rowEnd - rowStart;
    const isLastRow = rowEnd >= items.length;
    const availableWidth = containerWidth - gap * (count - 1);
    // Justify: scale the row to fill the container. The trailing partial row
    // keeps the target height (Google Photos behavior) instead of stretching.
    const rowHeight = isLastRow
      ? Math.min(targetRowHeight, availableWidth / ratioSum)
      : availableWidth / ratioSum;

    let x = 0;
    for (let i = rowStart; i < rowEnd; i++) {
      const width = rowHeight * mediaAspectRatio(items[i]);
      positioned.push({
        item: items[i],
        index: i,
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(rowHeight),
      });
      x += width + gap;
    }
    y += rowHeight + gap;
    rowStart = rowEnd;
  }

  return { items: positioned, totalHeight: Math.max(0, Math.round(y - gap)) };
}
