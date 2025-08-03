import { useState, useCallback, useMemo } from 'react';
import { useDebounce } from './useDebounce';

interface UseSearchOptions {
  debounceMs?: number;
  minLength?: number;
}

export function useSearch<T>(
  items: T[],
  searchFields: (keyof T)[],
  options: UseSearchOptions = {}
) {
  const { debounceMs = 300, minLength = 0 } = options;
  const [query, setQuery] = useState('');
  
  const debouncedQuery = useDebounce(query, debounceMs);
  
  const filteredItems = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < minLength) {
      return items;
    }
    
    const lowercaseQuery = debouncedQuery.toLowerCase();
    
    return items.filter(item => 
      searchFields.some(field => {
        const value = item[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(lowercaseQuery);
        }
        if (typeof value === 'number') {
          return value.toString().includes(lowercaseQuery);
        }
        return false;
      })
    );
  }, [items, debouncedQuery, searchFields, minLength]);
  
  const clearSearch = useCallback(() => {
    setQuery('');
  }, []);
  
  return {
    query,
    setQuery,
    debouncedQuery,
    filteredItems,
    clearSearch,
    isSearching: query !== debouncedQuery,
  };
}