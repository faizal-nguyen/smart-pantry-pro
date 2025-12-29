import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface AutocompleteSuggestion {
  id: string;
  label: string;
  value: string;
  section?: string;
  meta?: string;
  // Optional payload for caller-specific data
  [key: string]: any;
}

interface AutocompleteProps {
  value: string;
  onValueChange: (val: string) => void;
  suggestions: AutocompleteSuggestion[];
  onSelect: (s: AutocompleteSuggestion) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  maxItems?: number;
}

export const Autocomplete: React.FC<AutocompleteProps> = ({
  value,
  onValueChange,
  suggestions,
  onSelect,
  placeholder,
  className,
  inputClassName,
  open,
  onOpenChange,
  maxItems = 8
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const filtered = useMemo(() => {
    if (!value.trim()) return suggestions.slice(0, maxItems);
    const v = value.toLowerCase();
    return suggestions.filter(s => s.label.toLowerCase().includes(v)).slice(0, maxItems);
  }, [value, suggestions, maxItems]);

  const grouped = useMemo(() => {
    const map = new Map<string, AutocompleteSuggestion[]>();
    for (const s of filtered) {
      const key = s.section || 'Autres';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries());
  }, [filtered]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [setOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const flat = filtered;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && flat[activeIndex]) {
        onSelect(flat[activeIndex]);
        setOpen(false);
        e.preventDefault();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const highlight = (label: string, q: string) => {
    if (!q) return label;
    const i = label.toLowerCase().indexOf(q.toLowerCase());
    if (i === -1) return label;
    const before = label.slice(0, i);
    const match = label.slice(i, i + q.length);
    const after = label.slice(i + q.length);
    return (
      <>
        {before}
        <mark className="bg-yellow-200 text-inherit rounded px-0.5">{match}</mark>
        {after}
      </>
    );
  };

  return (
    <div className={className} ref={containerRef}>
      <input
        value={value}
        onChange={e => { onValueChange(e.target.value); setOpen(true); setActiveIndex(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={inputClassName}
      />
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-popover border rounded shadow">
          {grouped.map(([section, items]) => (
            <div key={section}>
              <div className="px-3 py-1 text-xs text-muted-foreground border-b bg-muted/30">{section}</div>
              {items.map((s, idx) => {
                const flatIndex = filtered.findIndex(f => f.id === s.id);
                const active = flatIndex === activeIndex;
                return (
                  <button
                    type="button"
                    key={s.id}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-accent flex justify-between ${active ? 'bg-accent' : ''}`}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => { onSelect(s); setOpen(false); }}
                  >
                    <span>{highlight(s.label, value)}</span>
                    {s.meta && <span className="text-xs text-muted-foreground ml-2">{s.meta}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

