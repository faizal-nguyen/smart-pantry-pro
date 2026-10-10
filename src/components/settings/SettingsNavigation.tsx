import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Bell, BookOpen, ChefHat, Heart, Palette, Shield, User as UserIcon } from 'lucide-react';
import { SETTINGS_SECTIONS, useSettingsSection, type SettingsSection } from '@/hooks/useSettingsSection';
import { cn } from '@/lib/utils';

const sections = [
  { id: 'cooking', label: 'Profil alimentaire', detail: 'Goûts, contraintes, temps et portions', icon: ChefHat },
  { id: 'assistant-memory', label: 'Mémoire de l’assistant', detail: 'Souvenirs enregistrés et conversations', icon: BookOpen },
  { id: 'data-privacy', label: 'Données et confidentialité', detail: 'Historique, export et conservation', icon: Shield },
  { id: 'account', label: 'Compte', detail: 'Connexion et informations personnelles', icon: UserIcon },
  { id: 'notifications', label: 'Notifications', detail: 'Rappels et autorisations', icon: Bell },
  { id: 'appearance', label: 'Apparence', detail: 'Clair, sombre et affichage', icon: Palette },
  { id: 'nutrition', label: 'Nutrition et bien-être', detail: 'Informations et disponibilité', icon: Heart },
] satisfies Array<{ id: SettingsSection; label: string; detail: string; icon: typeof ChefHat }>;

/** Mobile opens a real list of destinations; direct section links remain stable. */
export default function SettingsNavigation({ renderSection }: { renderSection: (section: SettingsSection) => ReactNode }) {
  const { section } = useSettingsSection();
  const [params] = useSearchParams();
  const hasSection = SETTINGS_SECTIONS.includes(params.get('section') as SettingsSection);
  const title = useRef<HTMLHeadingElement>(null);
  const current = sections.find(item => item.id === section)!;
  useEffect(() => { if (hasSection) title.current?.focus(); }, [section, hasSection]);
  const sectionUrl = (id?: SettingsSection) => {
    const next = new URLSearchParams(params);
    if (id) next.set('section', id); else next.delete('section');
    const query=next.toString();
    return '/settings' + (query ? '?' + query : '');
  };
  return <div className="md:grid md:grid-cols-[240px_minmax(0,1fr)] md:gap-6">
    <nav aria-label="Rubriques des paramètres" className={cn('space-y-1', hasSection && 'hidden md:block')}>
      {sections.map(({ id, label, detail, icon: Icon }) => <Link key={id} to={sectionUrl(id)} aria-current={hasSection && section === id ? 'page' : undefined}
        className={cn('flex min-h-11 items-start gap-3 rounded-lg border-b px-3 py-4 md:py-3', hasSection && section === id && 'bg-secondary')}>
        <Icon className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" /><span className="min-w-0"><span className="block font-medium">{label}</span><span className="block text-sm text-muted-foreground">{detail}</span></span>
      </Link>)}
    </nav>
    <section className={cn('min-w-0 space-y-4', !hasSection && 'hidden md:block')} aria-labelledby="settings-section-title">
      <Link to={sectionUrl()} className="inline-flex min-h-11 items-center gap-2 text-sm underline md:hidden"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Toutes les rubriques</Link>
      <h2 ref={title} tabIndex={-1} id="settings-section-title" className="text-lg font-semibold">{hasSection ? current.label : 'Tes préférences'}</h2>
      {hasSection ? renderSection(section) : <p className="text-sm text-muted-foreground">Choisis une rubrique pour retrouver tes préférences.</p>}
    </section>
  </div>;
}
