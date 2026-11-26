import { useState, type ReactNode } from 'react';

/**
 * A folded block whose content is mounted (and read) only once it has been opened. `heading`: the
 * summary carries an h2, for a fold that is a section of the page outline.
 */
export default function LazyFold({ summary, heading = false, className = 'kitchen-fold', children }: { summary: string; heading?: boolean; className?: string; children: ReactNode }) {
  const [opened, setOpened] = useState(false);
  return <details className={className} onToggle={event => { if (event.currentTarget.open) setOpened(true); }}>
    <summary>{heading ? <h2 className="kitchen-fold-title">{summary}</h2> : summary}</summary>
    {opened && <div>{children}</div>}
  </details>;
}
