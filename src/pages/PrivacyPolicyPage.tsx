import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import KitchenBrand from '@/components/navigation/KitchenBrand';
import { MarkdownLite } from '@/lib/markdownLite';
import privacyPolicy from '@/content/privacyPolicy';

const TITLE = 'Politique de confidentialité — Kitchen OS';

/** V11-06 E7: the privacy policy, public (no session needed), rendered from the repository file. */
export default function PrivacyPolicyPage() {
  useEffect(() => {
    const previous = document.title;
    document.title = TITLE;
    return () => { document.title = previous; };
  }, []);
  return <div className="min-h-screen bg-background">
    <header className="border-b">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <KitchenBrand />
        <Link to="/" className="inline-flex min-h-11 items-center gap-2 text-sm underline underline-offset-4">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />Retour à l’application
        </Link>
      </div>
    </header>
    <main className="mx-auto max-w-3xl px-4 py-8">
      <article className="space-y-4 break-words">
        <MarkdownLite source={privacyPolicy} />
      </article>
    </main>
  </div>;
}
