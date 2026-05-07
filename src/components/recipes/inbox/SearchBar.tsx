import React from 'react';
import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  /** When true, the input is disabled (typically while a list query is in flight). */
  disabled?: boolean;
}

/**
 * Title-search input for the inbox (PRP-220.12). Debouncing is owned
 * by the parent so the value can be lifted alongside other query
 * filters; this component just renders the controlled input + clear
 * button.
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  className,
  placeholder = 'Rechercher dans l\'inbox…',
  disabled,
}) => (
  <div className={cn('relative', className)}>
    <Search
      aria-hidden
      className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
    />
    <Input
      type="search"
      role="searchbox"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label="Rechercher dans l'inbox"
      disabled={disabled}
      className="pl-9 pr-9"
    />
    {value && !disabled && (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onChange('')}
        aria-label="Effacer la recherche"
        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    )}
  </div>
);

export default SearchBar;
