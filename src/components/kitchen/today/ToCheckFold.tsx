import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/** Rank 6: what is left to check, folded and counted, after the stock to use soon. */
export default function ToCheckFold({ sharePending, produceCount }: { sharePending: boolean; produceCount: number }) {
  const count = (sharePending ? 1 : 0) + produceCount;
  if (count === 0) return null;
  return <details className="kitchen-fold">
    <summary><h2 className="kitchen-fold-title">À vérifier ({count})</h2></summary>
    <div>
      {sharePending && <div className="kitchen-notice"><p>Un lien de recette reste à reprendre.</p><Button variant="outline" className="min-h-11" asChild><Link to="/share-target">Reprendre le partage</Link></Button></div>}
      {produceCount > 0 && <div className="kitchen-notice"><p>{produceCount} {produceCount === 1 ? 'fruit, légume ou herbe à vérifier' : 'fruits, légumes ou herbes à vérifier'} : en as-tu encore ?</p><Button className="min-h-11" variant="outline" asChild><Link to="/pantry/inventory#produce-review">Vérifier mon stock</Link></Button></div>}
    </div>
  </details>;
}
