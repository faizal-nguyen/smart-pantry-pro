import type { ReactNode } from 'react';

/** Shared hierarchy for the tools in the culinary notebook. */
export default function KitchenPageHeader({ title, description, actions }: { title: string; description: ReactNode; actions?: ReactNode }) {
  return <header className="kitchen-page-heading">
    <div className="kitchen-page-heading-copy"><h1 className="culinary-title">{title}</h1><p>{description}</p></div>
    {actions && <div className="kitchen-page-heading-actions">{actions}</div>}
  </header>;
}
