import { useEffect, useRef, useState } from 'react';

export function useIntersection<T extends Element>(
  element: React.RefObject<T>,
  options?: IntersectionObserverInit
) {
  const [isInView, setIsInView] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!element.current) return;

    observerRef.current = new IntersectionObserver(([entry]) => {
      setIsInView(entry.isIntersecting);
    }, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options
    });

    observerRef.current.observe(element.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [element, options]);

  return isInView;
}