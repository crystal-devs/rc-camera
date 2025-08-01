// components/photo/skeleton/Skeleton.tsx - Pinterest Style Skeleton
import { useEffect, useState, useRef } from 'react';
import './skeleton.css';

interface SkeletonProps {
  count?: number;
  containerWidth?: number;
}

const Skeleton: React.FC<SkeletonProps> = ({ count = 20, containerWidth }) => {
  const [localContainerWidth, setLocalContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerWidth) {
      setLocalContainerWidth(containerWidth);
      return;
    }

    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setLocalContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);
    setLocalContainerWidth(containerRef.current.getBoundingClientRect().width);

    return () => resizeObserver.disconnect();
  }, [containerWidth]);

  // Pinterest-style responsive columns
  const getColumnConfig = (width: number) => {
    if (width < 480) return { columns: 2, gap: 4, padding: 8 };
    if (width < 768) return { columns: 3, gap: 8, padding: 12 };
    if (width < 1024) return { columns: 4, gap: 12, padding: 16 };
    if (width < 1440) return { columns: 5, gap: 16, padding: 20 };
    return { columns: 6, gap: 20, padding: 24 };
  };

  const config = getColumnConfig(localContainerWidth || 1200);
  const availableWidth = (localContainerWidth || 1200) - (config.padding * 2) - (config.gap * (config.columns - 1));
  const columnWidth = Math.floor(availableWidth / config.columns);

  // Generate varied height skeleton items - Pinterest style
  const skeletonItems = Array.from({ length: count }, (_, index) => {
    // Pinterest-like aspect ratios for variety
    const aspectRatios = [0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2];
    const aspectRatio = aspectRatios[index % aspectRatios.length];
    const height = Math.round(columnWidth * aspectRatio);

    return {
      id: `skeleton-${index}`,
      height,
      delay: (index % 6) * 0.05 // Subtle staggered animation
    };
  });

  // Calculate masonry positions
  const columnHeights = Array(config.columns).fill(0);
  const itemPositions = skeletonItems.map((item) => {
    const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
    const x = config.padding + shortestColumnIndex * (columnWidth + config.gap);
    const y = columnHeights[shortestColumnIndex];

    columnHeights[shortestColumnIndex] += item.height + config.gap;

    return {
      ...item,
      x,
      y,
      width: columnWidth
    };
  });

  const containerHeight = Math.max(...columnHeights);

  return (
    <div 
      ref={containerRef}
      className="relative w-full"
      style={{ height: containerHeight }}
    >
      {itemPositions.map((item) => (
        <div
          key={item.id}
          className="absolute skeleton-pinterest"
          style={{
            left: item.x,
            top: item.y,
            width: item.width,
            height: item.height,
            animationDelay: `${item.delay}s`
          }}
        />
      ))}
    </div>
  );
};

export default Skeleton;