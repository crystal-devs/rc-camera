// utils/imageOptimization.ts
export const ImageOptimizer = {
  // Generate responsive image URLs
  generateResponsiveUrls(baseUrl: string, breakpoints = [300, 600, 900, 1200]) {
    if (!baseUrl.includes('imagekit.io') && !baseUrl.includes('ik.imagekit.io')) {
      return breakpoints.reduce((acc, width) => {
        acc[width] = baseUrl;
        return acc;
      }, {} as Record<number, string>);
    }

    return breakpoints.reduce((acc, width) => {
      acc[width] = `${baseUrl}?tr=w-${width},q-auto,f-auto`;
      return acc;
    }, {} as Record<number, string>);
  },

  // Generate srcSet string
  generateSrcSet(responsiveUrls: Record<number, string>): string {
    return Object.entries(responsiveUrls)
      .map(([width, url]) => `${url} ${width}w`)
      .join(', ');
  },

  // Get optimal image URL based on device pixel ratio and viewport
  getOptimalUrl(responsiveUrls: Record<number, string>, containerWidth: number) {
    const dpr = window.devicePixelRatio || 1;
    const targetWidth = containerWidth * dpr;
    
    const breakpoints = Object.keys(responsiveUrls)
      .map(Number)
      .sort((a, b) => a - b);
    
    // Find the smallest breakpoint that's larger than target width
    const optimalBreakpoint = breakpoints.find(bp => bp >= targetWidth) || 
                              breakpoints[breakpoints.length - 1];
    
    return responsiveUrls[optimalBreakpoint];
  },

  // Create blur placeholder from image URL
  createBlurPlaceholder(baseUrl: string): string {
    if (!baseUrl.includes('imagekit.io') && !baseUrl.includes('ik.imagekit.io')) {
      return baseUrl;
    }
    return `${baseUrl}?tr=w-20,h-20,bl-10,q-20`;
  },

  // Detect WebP support
  supportsWebP(): Promise<boolean> {
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = function () {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  },

  // Detect AVIF support
  supportsAVIF(): Promise<boolean> {
    return new Promise((resolve) => {
      const avif = new Image();
      avif.onload = avif.onerror = function () {
        resolve(avif.height === 2);
      };
      avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAMAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
    });
  }
};