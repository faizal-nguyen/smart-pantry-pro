import { useState, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';

interface UseInfiniteScrollOptions {
  pageSize?: number;
  threshold?: number;
  rootMargin?: string;
}

export function useInfiniteScroll<T>(
  allItems: T[],
  options: UseInfiniteScrollOptions = {}
) {
  const { pageSize = 20, threshold = 0.1, rootMargin = '100px' } = options;
  const [currentPage, setCurrentPage] = useState(1);
  
  const { ref: loadMoreRef, inView } = useInView({
    threshold,
    rootMargin,
  });
  
  const visibleItems = allItems.slice(0, currentPage * pageSize);
  const hasMore = allItems.length > visibleItems.length;
  
  const loadMore = useCallback(() => {
    if (hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasMore]);
  
  // Auto-load when scroll trigger is in view
  if (inView && hasMore) {
    loadMore();
  }
  
  const reset = useCallback(() => {
    setCurrentPage(1);
  }, []);
  
  return {
    visibleItems,
    hasMore,
    loadMore,
    loadMoreRef,
    isLoading: false, // Could be enhanced with actual loading state
    reset,
    currentPage,
    totalPages: Math.ceil(allItems.length / pageSize),
  };
}