import { useMemo, useState, lazy, Suspense } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Package, Plus, Pencil, ChefHat, LayoutGrid, List, ShoppingCart, Camera } from 'lucide-react';
import { calendarDaysUntil, pantryDateLabel } from '@smart/shared';
import { useInventory, type InventoryItem } from '@/hooks/useInventory';
import { useShoppingList } from '@/hooks/useShoppingList';
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { useCalendarNow } from '@/hooks/useCalendarNow';
import { useRoutinePreferences } from '@/hooks/useRoutinePreferences';
import { useOwnedValue, removeOwnedValue } from '@/lib/ownedStorage';
import { undoStockCommand } from '@/services/stockCommands';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import QuickStockCorrection from '@/components/inventory/QuickStockCorrection';
import QuickStockDialog from '@/components/inventory/QuickStockDialog';
import RoutineDiscardDialog from '@/components/inventory/RoutineDiscardDialog';
import { DiscardDraftSchema,prepareDiscard,type DiscardDraft } from '@/services/stockDiscard';
const AddProductDialog = lazy(() => import('@/components/inventory/AddProductDialog'));
const MobileBarcodeScanner = lazy(() => import('@/components/scanner/MobileBarcodeScanner'));

interface CategoryDef {
  key: string;
  label: string;
  icon: string;
  matchers: string[]; // substrings (lowercase, accentless tolerated)
}

const CATEGORY_DEFS: readonly CategoryDef[] = [
  // Order matters — categorizeProduct returns the first match. The
  // catalogue ships a combined "Fruits/Légumes" / "Fruits et Légumes"
  // category, so we MUST test 'legumes' before 'fruits' otherwise
  // every vegetable in that bucket gets misrouted to 🍎 Fruits.
  // (Pure-fruit products are then resolved by the productNameHints
  // override below when the raw category is the combined one.)
  { key: 'legumes',     label: 'Légumes',     icon: '🥬', matchers: ['légume', 'legume', 'vegetable'] },
  { key: 'fruits',      label: 'Fruits',      icon: '🍎', matchers: ['fruit'] },
  { key: 'viandes',     label: 'Viandes',     icon: '🥩', matchers: ['viande', 'meat'] },
  { key: 'poissons',    label: 'Poissons',    icon: '🐟', matchers: ['poisson', 'fish'] },
  { key: 'laitiers',    label: 'Laitiers',    icon: '🥛', matchers: ['laitier', 'dairy', 'fromage', 'yaourt'] },
  { key: 'boulangerie', label: 'Boulangerie', icon: '🥖', matchers: ['boulang', 'pain', 'viennoiserie', 'bakery'] },
  { key: 'feculents',   label: 'Féculents',   icon: '🍝', matchers: ['féculent', 'feculent', 'pâte', 'pate', 'riz', 'céréale', 'cereale', 'cereal', 'pasta'] },
  { key: 'epices',      label: 'Épices',      icon: '🧂', matchers: ['épice', 'epice', 'spice', 'condiment', 'herbe', 'aromate'] },
  { key: 'epicerie',    label: 'Épicerie',    icon: '🥫', matchers: ['épicerie', 'epicerie', 'conserve', 'canned', 'sauce', 'huile'] },
  { key: 'surgeles',    label: 'Surgelés',    icon: '🧊', matchers: ['surgelé', 'surgele', 'frozen', 'congelé', 'congele'] },
  { key: 'boissons',    label: 'Boissons',    icon: '🥤', matchers: ['boisson', 'beverage', 'drink', 'jus', 'soda'] },
  { key: 'snacks',      label: 'Snacks',      icon: '🍪', matchers: ['snack', 'gâteau', 'gateau', 'biscuit', 'chocolat', 'confiserie'] },
  { key: 'autres',      label: 'Autres',      icon: '📦', matchers: [] },
] as const;

const ALL_CATEGORY_KEY = 'all';

// Name-based heuristics. The catalogue.category column is unreliable
// (~50% of voice-created products default to 'autres', a handful have
// outright wrong values like "Pain de mie ... → Boissons"), so we
// match the PRODUCT NAME first and only fall back to the raw
// category. Each hint is matched on word boundaries so "pomme" does
// NOT match "pomme de terre" (handled by the explicit potato guard
// below + the legumes hints).
//
// Ordering inside this dict doesn't matter; we iterate the keys in
// the priority order defined by CATEGORY_PRIORITY below.
const NAME_HINTS: Readonly<Record<string, readonly string[]>> = {
  legumes: [
    'pommes de terre', 'pomme de terre', 'patate douce', 'patate',
    'oignon', 'échalote',
    'echalote', 'ail', 'tomate', 'concombre', 'poivron', 'courgette',
    'aubergine', 'carotte', 'salade', 'laitue', 'épinard', 'epinard',
    'chou', 'brocoli', 'haricot vert', 'pois chiche', 'lentille',
    'champignon', 'radis', 'betterave', 'navet', 'poireau', 'fenouil',
    'asperge', 'artichaut', 'cornichon', 'olive', 'avocat', 'céleri',
    'celeri',
  ],
  fruits: [
    'pomme', 'banane', 'orange', 'fraise', 'framboise', 'mangue', 'kiwi',
    'pêche', 'peche', 'abricot', 'poire', 'cerise', 'myrtille', 'raisin',
    'pastèque', 'pasteque', 'melon', 'ananas', 'citron', 'pamplemousse',
    'mandarine', 'clémentine', 'clementine', 'datte', 'figue', 'grenade',
    'litchi', 'noix de coco',
  ],
  viandes: [
    'aile de poulet', 'cuisse de poulet', 'escalope de poulet',
    'pilon de poulet', 'pilon', 'escalope', 'poulet', 'bœuf', 'boeuf',
    'steak', 'agneau', 'gigot', 'veau', 'porc', 'jambon', 'saucisse',
    'lard', 'bacon', 'dinde', 'canard', 'viande', 'mince', 'haché',
    'hache', 'bavette', 'entrecôte', 'entrecote', 'faux-filet', 'côte',
    'merguez', 'chorizo',
  ],
  poissons: [
    'poisson', 'saumon', 'thon', 'cabillaud', 'maquereau', 'sardine',
    'hareng', 'truite', 'sole', 'lieu', 'colin', 'crevette', 'gambas',
    'moule', 'huître', 'huitre', 'crabe', 'surimi', 'anchois',
  ],
  laitiers: [
    'lait', 'fromage', 'fromage blanc', 'yaourt', 'yoghourt', 'crème',
    'creme', 'beurre', 'mozzarella', 'parmesan', 'cheddar', 'feta',
    'mascarpone', 'ricotta', 'brie', 'camembert', 'comté', 'comte',
    'gruyère', 'gruyere', 'skyr', 'œuf', 'oeuf', 'egg',
  ],
  boulangerie: [
    'pain', 'baguette', 'ciabatta', 'naan', 'pita', 'focaccia',
    'croissant', 'brioche', 'viennoiserie', 'tortilla', 'wrap',
    'biscotte', 'toast',
  ],
  feculents: [
    'fleurs de mais', 'fleurs de maïs', 'cornflake', 'corn flake',
    'céréale', 'cereale', 'cereal', "flocon d'avoine", 'flocon davoine',
    'riz', 'pâte', 'pate', 'pasta', 'nouille', 'noodle', 'spaghetti',
    'penne', 'fusilli', 'lasagne', 'tagliatelle', 'macaroni', 'udon',
    'ramen', 'soba', 'quinoa', 'boulgour', 'bulgur', 'polenta',
    'couscous', 'semoule', 'orzo', 'maïs', 'mais',
  ],
  epices: [
    'ail semoule', 'ail en poudre', 'ail granulé', 'ail granule',
    'oignon en poudre', 'gingembre en poudre', 'gingembre moulu',
    'curcuma', 'cumin', 'paprika', 'poivre', 'sel', 'cannelle', 'muscade',
    'cardamome', 'coriandre', 'basilic', 'persil', 'ciboulette', 'thym',
    'romarin', 'laurier', 'menthe', 'origan', 'gochujang', 'gochugaru',
    'sumac', 'allspice', 'piment', 'épice', 'epice', 'masala',
    'pâte de curry', 'pate de curry', 'en poudre', 'moulu', 'moulue',
  ],
  epicerie: [
    'concentré de tomate', 'concentre de tomate', 'pâte de tomate',
    'pate de tomate', 'huile', 'vinaigre', 'sauce', 'ketchup',
    'mayonnaise', 'mayo', 'moutarde', 'miel', 'sucre', 'confiture',
    'bouillon', 'sauce soja', 'soja', 'sirop', 'tahini', 'nduja',
    'pesto', 'cassonade',
  ],
  boissons: [
    'thé', 'tea', 'café', 'cafe', 'jus', 'soda', 'cola', 'limonade',
    'vin', 'bière', 'biere', 'eau', 'kombucha', 'smoothie', 'cocktail',
    'detox', 'kahwa', 'matcha', 'infusion', 'tisane',
  ],
  snacks: [
    'chip', 'biscuit', 'gâteau', 'gateau', 'chocolat', 'bonbon',
    'confiserie', 'praline', 'macaron', 'madeleine', 'cookie', 'brownie',
    'crêpe', 'crepe', 'pancake', 'tarte',
  ],
  surgeles: [
    'surgelé', 'surgele', 'congelé', 'congele', 'frite',
  ],
};

// Used for tie-breaks when two hints of identical length match (e.g.
// 'olive' in legumes vs 'pâte' in feculents). Lower index wins.
const CATEGORY_PRIORITY: readonly string[] = [
  'viandes',
  'poissons',
  'epices',
  'epicerie',
  'surgeles',
  'boulangerie',
  'feculents',
  'laitiers',
  'legumes',
  'fruits',
  'boissons',
  'snacks',
];

/**
 * Hints flattened across categories and sorted by length DESC so a
 * longer/more specific hint wins over a shorter generic one — e.g.
 *   "ail semoule"     → epices    (NOT legumes via "ail")
 *   "fleurs de mais"  → feculents (NOT legumes via "mais")
 *   "pomme de terre"  → legumes   (NOT fruits via "pomme")
 *
 * Computed once at module load.
 */
const FLAT_HINTS: ReadonlyArray<{ hint: string; key: string; priority: number }> = (() => {
  const out: Array<{ hint: string; key: string; priority: number }> = [];
  for (const [key, hints] of Object.entries(NAME_HINTS)) {
    const priority = CATEGORY_PRIORITY.indexOf(key);
    for (const hint of hints) {
      out.push({ hint, key, priority: priority === -1 ? Number.MAX_SAFE_INTEGER : priority });
    }
  }
  out.sort((a, b) => {
    if (a.hint.length !== b.hint.length) return b.hint.length - a.hint.length;
    return a.priority - b.priority;
  });
  return out;
})();

function matchesHint(lowerName: string, hint: string): boolean {
  const idx = lowerName.indexOf(hint);
  if (idx === -1) return false;
  const before = lowerName[idx - 1] ?? ' ';
  const after = lowerName[idx + hint.length] ?? ' ';
  const isBoundary = (c: string) => /[\s,.\-_()/'"\d]/.test(c);
  const boundaryBefore = isBoundary(before) || idx === 0;
  // Accept French plural 's' / 'x' as a valid word-end boundary so
  // "tomates", "poivrons", "frites" etc. match their singular hints.
  let boundaryAfter =
    isBoundary(after) || idx + hint.length === lowerName.length;
  if (!boundaryAfter && (after === 's' || after === 'x')) {
    const afterAfter = lowerName[idx + hint.length + 1] ?? ' ';
    boundaryAfter =
      isBoundary(afterAfter) || idx + hint.length + 1 === lowerName.length;
  }
  return boundaryBefore && boundaryAfter;
}

function categorizeByName(productName: string): string | null {
  const lower = productName.toLowerCase();
  for (const entry of FLAT_HINTS) {
    if (matchesHint(lower, entry.hint)) return entry.key;
  }
  return null;
}

function categorizeProduct(rawCategory?: string | null, productName?: string | null): string {
  // 1. Name-based — most reliable. Handles 'autres' and outright wrong
  // raw categories (e.g. "Pain de mie ... → Boissons").
  if (productName) {
    const byName = categorizeByName(productName);
    if (byName) return byName;
  }

  // 2. Raw catalogue category fallback. Useful for branded/specific
  // products whose name doesn't contain a generic hint.
  if (rawCategory) {
    const lower = rawCategory.toLowerCase();
    for (const def of CATEGORY_DEFS) {
      if (def.matchers.some((m) => lower.includes(m))) return def.key;
    }
  }

  return 'autres';
}

interface Filters { search:string; category:string; zone:string; status:string }
export default function Inventory() {
  const user = useAuthenticatedUser(), [params] = useSearchParams();
  const now = useCalendarNow();
  const stock = useInventory(), { addToShoppingList } = useShoppingList(), preferences = useRoutinePreferences();
  const [filters,setFilters,storageError] = useOwnedValue<Filters>(user.id,'stock-filters',{ search:'',category:'all',zone:'all',status:'available' });
  const [localView,setLocalView] = useOwnedValue<'list'|'grid'|null>(user.id,'stock-view',null);
  const view = localView ?? preferences.data?.stock_view ?? 'list';
  const [editing,setEditing] = useState<InventoryItem|null>(null), [quickOpen,setQuickOpen] = useState(false), [manualOpen,setManualOpen] = useState(false), [scannerOpen,setScannerOpen] = useState(false);
  const [message,setMessage] = useState(''), [actionError,setActionError] = useState<string|null>(null), [lastCommand,setLastCommand] = useState<string|null>(null);
  const [undoing,setUndoing] = useState(false);
  const [discardOpen,setDiscardOpen] = useState(false);
  const [discardRaw,,discardStorageError] = useOwnedValue<DiscardDraft|null>(user.id,'stock-discard',null);
  const discardParsed = DiscardDraftSchema.safeParse(discardRaw);
  const discard = discardParsed.success && discardParsed.data.owner===user.id ? discardParsed.data : null;
  const fail = (failure:unknown) => setActionError(failure instanceof Error ? failure.message : 'Action non confirmée.');
  const updateFilters = (patch:Partial<Filters>) => { try { setFilters({ ...filters,...patch }); } catch (failure) { fail(failure); } };
  const rows = useMemo(() => stock.inventory.filter(item => {
    const name = item.product?.name ?? 'Produit', days = calendarDaysUntil(item.expiry_date,now);
    return (!filters.search || `${name} ${item.location ?? ''}`.toLocaleLowerCase('fr').includes(filters.search.toLocaleLowerCase('fr')))
      && (filters.category === 'all' || categorizeProduct(item.product?.category,name) === filters.category)
      && (filters.zone === 'all' || item.location === filters.zone)
      && (filters.status !== 'available' || item.quantity>0)
      && (filters.status !== 'soon' || item.quantity>0 && days != null && days<=7)
      && (filters.status !== 'empty' || item.quantity===0);
  }),[stock.inventory,filters,now]);
  const categoryChips = CATEGORY_DEFS.filter(category => stock.inventory.some(item => categorizeProduct(item.product?.category,item.product?.name)===category.key));
  const save = async (id:string,updates:Partial<InventoryItem>) => {
    const result = await stock.updateInventoryItem(id,updates);
    setMessage('Correction confirmée. Le stock est à jour.'); setActionError(null); setLastCommand(result.command_id);
    removeOwnedValue(user.id,`correction:${id}`);
  };
  const shopping = async (item:InventoryItem) => {
    try { await addToShoppingList({ productName:item.product?.name ?? 'Produit',quantity:1,unit:item.unit ?? item.product?.unit_type ?? '',category:item.product?.category ?? 'Autres' }); setMessage('Produit ajouté aux courses.'); }
    catch (failure) { fail(failure); }
  };
  return <div className="mx-auto max-w-5xl p-4 space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Mon stock</h1><p className="text-sm text-muted-foreground">{stock.inventory.filter(item => item.quantity>0).length} lot(s) disponible(s)</p></div><Button className="min-h-11" onClick={() => setQuickOpen(true)}><Plus className="mr-2 h-4 w-4" aria-hidden="true" />Ajouter</Button></header>
    <div className="flex flex-wrap gap-2"><Button className="min-h-11" variant="outline" onClick={() => setManualOpen(true)}>Fiche produit</Button><Button className="min-h-11" variant="outline" onClick={() => setScannerOpen(true)}><Camera className="h-4 w-4 mr-2" aria-hidden="true" />Scanner</Button><Button className="min-h-11" variant="ghost" asChild><Link to="/insights">Mes analyses</Link></Button></div>
    <label className="block space-y-1">Rechercher un ingrédient<Input className="h-11" type="search" placeholder="Nom ou zone…" value={filters.search} onChange={e => updateFilters({ search:e.target.value })} /></label>
    <div className="flex flex-wrap gap-2"><label className="text-sm flex-1 min-w-[140px]">Catégorie<select className="mt-1 w-full h-11 rounded-md border bg-background px-2" value={filters.category} onChange={e => updateFilters({ category:e.target.value })}><option value="all">Toutes</option>{categoryChips.map(category => <option key={category.key} value={category.key}>{category.label}</option>)}</select></label><label className="text-sm flex-1 min-w-[140px]">Zone<select className="mt-1 w-full h-11 rounded-md border bg-background px-2" value={filters.zone} onChange={e => updateFilters({ zone:e.target.value })}><option value="all">Toutes les zones</option>{[...new Set(stock.inventory.map(item => item.location).filter(Boolean))].map(zone => <option key={zone} value={zone}>{zone}</option>)}</select></label></div>
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="État du stock">{[['available','Disponibles'],['soon','À utiliser bientôt'],['empty','Épuisés'],['all','Tous']].map(([status,label]) => <Button key={status} className="min-h-11" variant={filters.status===status ? 'default' : 'outline'} aria-pressed={filters.status===status} onClick={() => updateFilters({ status })}>{label}</Button>)}</div>
    <div className="flex justify-end gap-1" role="group" aria-label="Présentation du stock">{(['list','grid'] as const).map(mode => <Button key={mode} className="min-h-11" variant={view===mode ? 'secondary' : 'ghost'} aria-pressed={view===mode} onClick={() => { try { setLocalView(mode); void preferences.update({ stock_view:mode }).then(() => setLocalView(null)).catch(fail); } catch (failure) { fail(failure); } }}>{mode==='list' ? <List className="h-4 w-4 mr-2" aria-hidden="true" /> : <LayoutGrid className="h-4 w-4 mr-2" aria-hidden="true" />}{mode==='list' ? 'Liste' : 'Cartes'}</Button>)}</div>
    {discard && <div role="status" className="rounded-lg border p-3 space-y-2"><p>{discard.stock_confirmed ? 'Stock confirmé, déclaration de perte à reprendre' : 'Déclaration de perte à reprendre'} : {discard.product_name}.</p><Button className="min-h-11" variant="outline" onClick={()=>setDiscardOpen(true)}>Reprendre la déclaration de perte</Button></div>}
    {(discardStorageError || discardRaw && !discard) && <p role="alert">{discardStorageError || 'La déclaration de perte enregistrée doit être vérifiée.'}</p>}
    {(stock.error || actionError || storageError) && <div role="alert" className="rounded-lg border border-destructive p-3 space-y-2"><p>{actionError || storageError || 'Impossible de relire le stock. Réessayez.'}</p><Button className="min-h-11" variant="outline" onClick={() => void stock.refetch()}>Actualiser le stock</Button></div>}
    {message && <div role="status" className="rounded-lg border p-3"><p>{message}</p>{lastCommand && <Button className="min-h-11" variant="outline" disabled={undoing} onClick={() => { const id=lastCommand; setUndoing(true); void undoStockCommand(id).then(() => { setLastCommand(current=>current===id ? null : current); setActionError(null); setMessage('Correction annulée.'); void stock.refetch(); }).catch(fail).finally(()=>setUndoing(false)); }}>{undoing ? 'Vérification de l’annulation…' : 'Annuler cette correction'}</Button>}</div>}
    {stock.loading ? <p role="status">Chargement du stock…</p> : !rows.length ? <Card><CardContent className="p-5 space-y-3"><Package aria-hidden="true" /><h2 className="font-semibold">{stock.inventory.length ? 'Aucun produit pour ces filtres' : 'Votre premier stock'}</h2><p>Ajoutez vos ingrédients avec leur quantité. Les autres informations peuvent attendre.</p><Button className="min-h-11" onClick={() => stock.inventory.length ? updateFilters({ search:'',category:'all',zone:'all',status:'all' }) : setQuickOpen(true)}>{stock.inventory.length ? 'Voir tout le stock' : 'Ajouter quelques ingrédients'}</Button></CardContent></Card> : <ul className={view==='grid' ? 'grid sm:grid-cols-2 lg:grid-cols-3 gap-3' : 'space-y-2'} aria-label="Ingrédients en stock">
      {rows.map(item => <li id={`stock-${item.id}`} key={item.id} className={`rounded-xl border bg-card p-3 ${params.get('product')===item.id ? 'ring-2 ring-primary' : ''}`}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h2 className="font-semibold break-words">{item.product?.name ?? 'Produit à vérifier'}</h2><p className="font-medium">{Number.isFinite(item.quantity) ? `${item.quantity} ${item.unit ?? item.product?.unit_type ?? 'unité à vérifier'}` : 'Quantité à vérifier'}{item.quantity===0 ? ' · épuisé' : ''}</p><p className="text-sm text-muted-foreground">{item.location || 'Zone non renseignée'}</p><p className="text-sm">{pantryDateLabel(item.expiry_date,now)}</p></div><Button variant="outline" className="min-h-11 shrink-0" aria-label={`Corriger ${item.product?.name ?? 'ce produit'}`} onClick={() => setEditing(item)}><Pencil className="h-4 w-4 mr-2" aria-hidden="true" />Corriger</Button></div>
      <div className="mt-2 flex flex-wrap gap-1"><Button variant="ghost" className="min-h-11" asChild><Link to={`/kitchen/recipes?ingredient=${item.product_id}&ingredient_name=${encodeURIComponent(item.product?.name ?? '')}`}><ChefHat className="h-4 w-4 mr-1" aria-hidden="true" />Recettes</Link></Button><Button variant="ghost" className="min-h-11" aria-label={`Ajouter ${item.product?.name} aux courses`} onClick={() => void shopping(item)}><ShoppingCart className="h-4 w-4 mr-1" aria-hidden="true" />Racheter</Button><Button variant="ghost" className="min-h-11" onClick={() => setEditing(item)}>Utiliser / déplacer</Button><Button variant="ghost" className="min-h-11" aria-label={`Jeter ${item.product?.name ?? 'ce produit'}`} disabled={item.quantity<=0} onClick={()=>{ try { prepareDiscard(user.id,item);setDiscardOpen(true);setActionError(null); } catch (failure) { fail(failure); } }}>Jeter</Button></div></li>)}
    </ul>}
    <QuickStockDialog open={quickOpen} onOpenChange={setQuickOpen} onSaved={() => { setMessage('Les ajouts confirmés sont dans le stock.'); void stock.refetch(); }} />
    {editing && <QuickStockCorrection key={editing.id} item={editing} open onOpenChange={value => { if (!value) setEditing(null); }} onSave={save} />}
    {discardOpen && <RoutineDiscardDialog open onOpenChange={setDiscardOpen} onSaved={()=>{ setMessage('Perte enregistrée, stock mis à jour.');setLastCommand(null);setActionError(null);void stock.refetch(); }} />}
    <Suspense fallback={<p role="status">Ouverture…</p>}>{manualOpen && <AddProductDialog open onOpenChange={setManualOpen} />}{scannerOpen && <MobileBarcodeScanner open onClose={() => setScannerOpen(false)} onScanSuccess={() => { setScannerOpen(false); void stock.refetch(); }} mode="inventory" />}</Suspense>
  </div>;
}
