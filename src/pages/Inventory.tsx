import React, { useState, useMemo, useCallback, Suspense, lazy } from "react";
import { MaterialCard, MaterialCardContent } from "@/components/ui/material/Card";
import { Badge } from "@/components/ui/badge";
import { MaterialButton } from "@/components/ui/material/Button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Package,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Grid3X3,
  List,
  MapPin,
  Target,
  BarChart3,
  Pencil,
  Trash2,
} from "lucide-react";
import { useInventory, InventoryItem } from "@/hooks/useInventory";
import { useFoodWaste, RecordWasteInput } from "@/hooks/useFoodWaste";
import { SmartProductCard } from "@/components/inventory/SmartProductCard";
import { IntelligentSearch } from "@/components/inventory/IntelligentSearch";
import { FloatingActionButton } from "@/components/inventory/FloatingActionButton";

// Perf audit 2026-05-19 — ces composants ne sont visibles que sur action
// utilisateur (dialog open ou voice toggle). Lazy-load les sort du chunk
// principal InventoryPage (569 KB non gzippé). Chunks séparés = TTI plus
// rapide au premier render, surtout sur mobile en cuisine.
const AddProductDialog = lazy(() => import("@/components/inventory/AddProductDialog"));
const TextBulkAddDialog = lazy(() => import("@/components/inventory/TextBulkAddDialog"));
const EditItemDialog = lazy(() => import("@/components/inventory/EditItemDialog"));
const DiscardItemDialog = lazy(() => import("@/components/inventory/DiscardItemDialog"));
const EnhancedVoiceButton = lazy(() =>
  import("@/components/voice/EnhancedVoiceButton").then((m) => ({ default: m.EnhancedVoiceButton }))
);
const MobileBarcodeScanner = lazy(() =>
  import("@/components/scanner/MobileBarcodeScanner").then((m) => ({ default: m.MobileBarcodeScanner }))
);
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useShoppingList } from "@/hooks/useShoppingList";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// 2026-05-19 — vue 3D supprimée (SimpleInventory3D, three.js, drei).
// Le chunk lazy + scène WebGL n'apportait pas de valeur produit et
// alourdissait le bundle pour rien. Le composant fichier existe encore
// dans src/visualization/ mais n'est plus monté ; on le supprimera dans
// un cleanup ultérieur.

const NutritionProgressRings = React.lazy(() =>
  import('@/components/progress/NutritionProgressRings').then(module => ({
    default: module.NutritionProgressRings
  }))
);

interface Zone {
  name: string;
  icon: string;
  color: string;
  locations: string[];
}

const ZONES: Zone[] = [
  {
    name: 'Frigo',
    icon: '❄️',
    color: 'blue',
    locations: ['Frigo', 'Réfrigérateur']
  },
  {
    name: 'Congélateur',
    icon: '🧊',
    color: 'cyan',
    locations: ['Congélateur', 'Freezer']
  },
  {
    name: 'Placard',
    icon: '🥫',
    color: 'amber',
    locations: ['Placard', 'Garde-manger', 'Étagère']
  },
  {
    name: 'Autres',
    icon: '📦',
    color: 'gray',
    locations: []
  }
];

/**
 * 2026-05-19 — filtre catégorie (remplace le filtre par zone).
 *
 * Les sources de `product.category` sont hétérogènes ("Fruits/Légumes",
 * "Légumes", "Épicerie", "Surgelés", "fruits", "vegetables", etc.) parce
 * que les produits viennent de plusieurs flux (OpenFoodFacts, scanner,
 * saisie manuelle, parser vocal). On définit ici une liste canonique de
 * catégories user-friendly + un mapper qui ramène n'importe quel libellé
 * brut vers une clé de cette liste.
 *
 * Ordre important : le premier matcher qui matche gagne. "fruit" passe
 * avant "légume" pour qu'un libellé "Fruits et légumes" ne soit pas
 * silencieusement reclassé en légume.
 */
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

const Inventory = () => {
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>(ALL_CATEGORY_KEY);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'zones' | 'progress'>('grid');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [textBulkDialogOpen, setTextBulkDialogOpen] = useState(false);
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeVisualizationTab, setActiveVisualizationTab] = useState('overview');
  
  // 2026-05-18 — fix: the hook exposes `updateInventoryItem` and
  // `addToInventory`, not the previously-destructured (and undefined)
  // `updateInventory` / `addInventory`. Renaming via destructuring
  // alias keeps the rest of this 800-line file unchanged.
  const {
    inventory,
    loading,
    error: inventoryError,
    updateInventoryItem: updateInventory,
    deleteInventoryItem,
    addToInventory: addInventory,
    refetch: refetchInventory,
  } = useInventory();
  const { addToShoppingList } = useShoppingList();
  const { recordWaste } = useFoodWaste();
  const [discardingItem, setDiscardingItem] = useState<InventoryItem | null>(null);
  const navigate = useNavigate();

  // Group inventory by zones (vue "Zones" — affichage groupé par lieu
  // de stockage, indépendant du nouveau filtre catégorie)
  const inventoryByZones = useMemo(() => {
    const grouped: Record<string, InventoryItem[]> = {};

    ZONES.forEach(zone => {
      grouped[zone.name] = inventory.filter(item => {
        if (!item.location && zone.name === 'Autres') return true;
        if (!item.location) return false;
        return zone.locations.some(loc =>
          item.location.toLowerCase().includes(loc.toLowerCase())
        );
      });
    });

    return grouped;
  }, [inventory]);

  // 2026-05-19 — chips de filtre par catégorie : on dérive dynamiquement
  // les catégories réellement présentes dans l'inventaire (avec count)
  // pour éviter de montrer "Surgelés (0)" à un utilisateur qui n'a que
  // des fruits / légumes.
  const categoryChips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of inventory) {
      const key = categorizeProduct(item.product?.category, item.product?.name);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return CATEGORY_DEFS
      .filter((def) => (counts.get(def.key) ?? 0) > 0)
      .map((def) => ({
        ...def,
        count: counts.get(def.key) ?? 0,
      }));
  }, [inventory]);

  // Filtre actif appliqué à la liste affichée (grid / list)
  const filteredItems = useMemo(() => {
    if (selectedCategoryKey === ALL_CATEGORY_KEY) return inventory;
    return inventory.filter((item) => categorizeProduct(item.product?.category, item.product?.name) === selectedCategoryKey);
  }, [inventory, selectedCategoryKey]);

  // Fraîcheur dérivée directement de expiry_date — utilisée pour la vue
  // Nutrition (anneaux de progression). Anciennement passait par
  // `inventoryFor3D.freshness` ; vue 3D supprimée, on calcule en place.
  const avgFreshnessScore = useMemo(() => {
    if (inventory.length === 0) return 85;
    const monthMs = 30 * 24 * 60 * 60 * 1000;
    const total = inventory.reduce((sum, item) => {
      if (!item.expiry_date) return sum + 0.8;
      const ratio = (new Date(item.expiry_date).getTime() - Date.now()) / monthMs;
      return sum + Math.max(0, Math.min(1, ratio));
    }, 0);
    return Math.round((total / inventory.length) * 100);
  }, [inventory]);

  // Mock nutrition data for progress rings
  const nutritionData = useMemo(() => {
    const vitaminsScore = Math.min(100, inventory.length * 8 + Math.floor(Math.random() * 20));
    const varietyScore = Math.min(15, new Set(inventory.map(item => item.product?.category)).size);
    const freshnessScore = avgFreshnessScore;
    const balanceScore = Math.min(100, Math.floor(Math.random() * 20) + 75);

    return {
      vitamins: { 
        current: vitaminsScore,
        sources: inventory.slice(0, 3).map(item => item.product?.name).filter(Boolean),
        trend: 'increasing'
      },
      variety: { 
        current: varietyScore,
        categories: Array.from(new Set(inventory.map(item => item.product?.category)).values()).filter(Boolean),
        trend: 'stable'
      },
      freshness: { 
        current: freshnessScore,
        averageAge: Math.floor(Math.random() * 7) + 1,
        trend: 'stable'
      },
      balance: { 
        current: balanceScore,
        distribution: {
          fruits: Math.floor(Math.random() * 30) + 20,
          vegetables: Math.floor(Math.random() * 30) + 15,
          dairy: Math.floor(Math.random() * 25) + 15,
          grains: Math.floor(Math.random() * 20) + 10,
          protein: Math.floor(Math.random() * 15) + 10,
          herbs: Math.floor(Math.random() * 10) + 5
        },
        trend: 'improving'
      }
    };
  }, [inventory, avgFreshnessScore]);

  const nutritionGoals = {
    vitamins: 100,
    variety: 15,
    freshness: 90,
    balance: 85
  };

  // Stats calculations
  const stats = useMemo(() => {
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);
    
    const expiringItems = inventory.filter(item => {
      if (!item.expiry_date) return false;
      const expiryDate = new Date(item.expiry_date);
      return expiryDate <= threeDaysFromNow;
    });

    const lowStockItems = inventory.filter(item => 
      item.quantity <= (item.min_quantity || 1)
    );

    return {
      totalItems: inventory.length,
      expiringThisWeek: expiringItems.length,
      lowStock: lowStockItems.length
    };
  }, [inventory]);

  // Perf audit 2026-05-19 — useCallback pour que les SmartProductCard
  // (React.memo) ne soient pas re-renders à chaque keypress de recherche.
  const handleQuantityChange = useCallback(async (id: string, quantity: number) => {
    await updateInventory(id, { quantity });
  }, [updateInventory]);

  const handleMoveToShoppingList = useCallback(async (item: InventoryItem) => {
    await addToShoppingList({
      productName: item.product?.name || '',
      quantity: 1,
      unit: item.unit || 'unité',
      category: item.product?.category || 'Autres'
    });

    toast({
      title: "Ajouté aux courses",
      description: `${item.product?.name} a été ajouté à votre liste de courses`
    });
  }, [addToShoppingList]);

  const handleConsume = useCallback(async (item: InventoryItem) => {
    if (item.quantity > 1) {
      await updateInventory(item.id, { quantity: item.quantity - 1 });
    } else {
      await deleteInventoryItem(item.id);
    }

    toast({
      title: "Produit consommé",
      description: `${item.product?.name} a été marqué comme consommé`
    });
  }, [updateInventory, deleteInventoryItem]);

  const handleEdit = useCallback((item: InventoryItem) => {
    setEditingItem(item);
    setEditDialogOpen(true);
  }, []);

  const handleFindRecipes = useCallback((item: InventoryItem) => {
    navigate(`/recipes?ingredient=${item.product?.name}`);
  }, [navigate]);

  const handleDiscard = useCallback((item: InventoryItem) => {
    setDiscardingItem(item);
  }, []);

  const confirmDiscard = async (input: RecordWasteInput) => {
    if (!discardingItem) return;

    const event = await recordWaste(input);
    if (!event) {
      toast({
        variant: 'destructive',
        title: "Échec de l'enregistrement",
        description: "Impossible d'enregistrer le gaspillage. Réessaye.",
      });
      return;
    }

    await deleteInventoryItem(discardingItem.id);
    toast({
      title: 'Produit jeté',
      description: `${discardingItem.product?.name ?? 'Article'} ajouté à l'historique anti-gaspi.`,
    });
  };

  // P1 polish: removed the `handleSubstitute` toast that promised
  // "fonctionnalité arrive bientôt !". SmartProductCard's onSubstitute
  // prop is now optional — wire it back when the feature actually
  // ships.

  // IntelligentSearch émet la valeur brute `product?.category`. On la
  // normalise pour qu'elle coïncide avec une chip catégorie ; ainsi le
  // filtre reste cohérent quelle que soit la voie d'entrée.
  const handleCategorySelect = (category: string) => {
    setSelectedCategoryKey(categorizeProduct(category));
  };

  const handleRecipeSelect = (recipeId: string) => {
    navigate(`/kitchen/recipes/${recipeId}`);
  };

  const handleVoiceCommand = async (parsedInput: any) => {
    if (!parsedInput) return;

    switch (parsedInput.action) {
      case 'add':
        // Ajouter au panier ou à l'inventaire
        await addToShoppingList({
          productName: parsedInput.product,
          quantity: parsedInput.quantity || 1,
          unit: parsedInput.unit || 'unité',
          category: 'Autres'
        });
        
        toast({
          title: "Produit ajouté",
          description: `${parsedInput.quantity || 1} ${parsedInput.unit || 'unité'} de ${parsedInput.product} ajouté(s) à la liste de courses`
        });
        break;
        
      case 'remove':
        // Rechercher et supprimer le produit
        const itemToRemove = inventory.find(item => 
          item.product?.name.toLowerCase().includes(parsedInput.product.toLowerCase())
        );
        
        if (itemToRemove) {
          await deleteInventoryItem(itemToRemove.id);
          toast({
            title: "Produit supprimé",
            description: `${itemToRemove.product?.name} a été retiré de l'inventaire`
          });
        } else {
          toast({
            title: "Produit non trouvé",
            description: `Impossible de trouver "${parsedInput.product}" dans l'inventaire`,
            variant: "destructive"
          });
        }
        break;
        
      case 'search':
        // Rechercher des recettes
        navigate(`/recipes?ingredient=${parsedInput.product}`);
        break;
        
      default:
        toast({
          title: "Commande non reconnue",
          description: "Veuillez réessayer avec une commande plus claire",
          variant: "destructive"
        });
    }
  };

  const handleScanSuccess = async (product: any) => {
    try {
      // Ajouter le produit scanné à l'inventaire
      await addInventory({
        productName: product.name,
        quantity: 1,
        unit: product.unit || 'unité',
        category: product.category || 'Autres',
        location: 'Placard',
        barcode: product.barcode
      });
      
      toast({
        title: "Produit ajouté",
        description: `${product.name} a été ajouté à votre inventaire`
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le produit",
        variant: "destructive"
      });
    }
  };

  // Mobile audit P1#6 — en cuisine, un écran spinner sans issue est fatal.
  // On surface l'erreur explicitement avec un bouton retry.
  if (inventoryError) {
    return (
      <div className="page-container py-8" data-testid="inventory-error">
        <EmptyState
          icon={AlertTriangle}
          title="Impossible de charger l'inventaire"
          description={
            inventoryError.message ||
            "La connexion au serveur a échoué. Vérifie ta connexion puis réessaie."
          }
          action={{
            label: "Réessayer",
            onClick: () => {
              void refetchInventory();
            },
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-4 sm:space-y-6">
      {/* Header Intelligent */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Mon Inventaire</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gérez vos produits intelligemment
          </p>
        </div>

        <div
          className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 pb-1 sm:mx-0 sm:px-0 sm:flex-wrap sm:gap-2"
          role="tablist"
          aria-label="Mode d'affichage de l'inventaire"
        >
          <MaterialButton
            variant={viewMode === 'grid' ? 'filled' : 'outlined'}
            size="sm"
            onClick={() => setViewMode('grid')}
            icon={<Grid3X3 className="w-4 h-4" />}
            className="min-h-11 shrink-0"
          >
            Grille
          </MaterialButton>
          <MaterialButton
            variant={viewMode === 'list' ? 'filled' : 'outlined'}
            size="sm"
            onClick={() => setViewMode('list')}
            icon={<List className="w-4 h-4" />}
            className="min-h-11 shrink-0"
          >
            Liste
          </MaterialButton>
          <MaterialButton
            variant={viewMode === 'zones' ? 'filled' : 'outlined'}
            size="sm"
            onClick={() => setViewMode('zones')}
            icon={<MapPin className="w-4 h-4" />}
            className="min-h-11 shrink-0"
          >
            Zones
          </MaterialButton>
          <MaterialButton
            variant={viewMode === 'progress' ? 'filled' : 'outlined'}
            size="sm"
            onClick={() => setViewMode('progress')}
            icon={<Target className="w-4 h-4" />}
            className="min-h-11 shrink-0"
          >
            Nutrition
          </MaterialButton>
        </div>

        {/* Search Bar avec Voice Button */}
        <div className="flex gap-2">
          <div className="flex-1">
            <IntelligentSearch
              onCategorySelect={handleCategorySelect}
              onRecipeSelect={handleRecipeSelect}
            />
          </div>
          <Suspense fallback={null}>
            <EnhancedVoiceButton
              onVoiceInput={handleVoiceCommand}
              size="default"
            />
          </Suspense>
        </div>

        {/* Filtres par catégorie (remplace les chips par zone)
            Chip "Tous" toujours présent + chips dynamiques pour les
            catégories réellement présentes dans l'inventaire. */}
        <div
          className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 pb-2 sm:mx-0 sm:px-0 sm:flex-wrap"
          role="tablist"
          aria-label="Filtre par catégorie"
        >
          <Badge
            variant={selectedCategoryKey === ALL_CATEGORY_KEY ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setSelectedCategoryKey(ALL_CATEGORY_KEY)}
          >
            Tous ({inventory.length})
          </Badge>

          {stats.expiringThisWeek > 0 && (
            <Badge
              variant="outline"
              className="cursor-default whitespace-nowrap border-red-500 text-red-500"
            >
              🔴 Expirent bientôt ({stats.expiringThisWeek})
            </Badge>
          )}

          {categoryChips.map((cat) => (
            <Badge
              key={cat.key}
              variant={selectedCategoryKey === cat.key ? 'default' : 'outline'}
              className="cursor-pointer whitespace-nowrap"
              onClick={() =>
                setSelectedCategoryKey(
                  selectedCategoryKey === cat.key ? ALL_CATEGORY_KEY : cat.key,
                )
              }
            >
              {cat.icon} {cat.label} ({cat.count})
            </Badge>
          ))}
        </div>

        {/* Stats Bar */}
        <MaterialCard variant="elevated">
          <MaterialCardContent className="p-3 sm:p-4">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
              <div>
                <p className="text-xl sm:text-2xl font-bold">{stats.totalItems}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Produits</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-orange-500">{stats.expiringThisWeek}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Expirent</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-red-500">{stats.lowStock}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Stock bas</p>
              </div>
            </div>
          </MaterialCardContent>
        </MaterialCard>
      </div>

      {/* Main Content */}
      {viewMode === 'progress' ? (
        <div className="space-y-6">
          <MaterialCard variant="elevated">
            <MaterialCardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Anneaux de Progression Nutrition</h3>
              </div>
              
              <Suspense fallback={
                <div className="h-96 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-sm text-gray-600">Chargement des anneaux de progression...</p>
                  </div>
                </div>
              }>
                <NutritionProgressRings
                  nutritionData={nutritionData}
                  goals={nutritionGoals}
                  timeframe="daily"
                  size="large"
                  showLabels={true}
                  showStats={true}
                  onRingClick={(ringId) => {
                    toast({
                      title: "Détails nutritionnels",
                      description: `Affichage des détails pour: ${ringId}`
                    });
                  }}
                />
              </Suspense>
            </MaterialCardContent>
          </MaterialCard>

          {/* Additional Nutrition Insights */}
          <div className="grid md:grid-cols-2 gap-4">
            <MaterialCard variant="elevated">
              <MaterialCardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold">Tendances Hebdomadaires</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Progression moyenne</span>
                    <span className="font-medium">86%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Meilleur jour</span>
                    <span className="font-medium">Samedi (94%)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Série actuelle</span>
                    <span className="font-medium text-green-600">5 jours</span>
                  </div>
                </div>
              </MaterialCardContent>
            </MaterialCard>

            <MaterialCard variant="elevated">
              <MaterialCardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold">Objectifs</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Objectifs quotidiens</span>
                    <Badge className="bg-green-100 text-green-800">3/4 Complétés</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Objectifs hebdomadaires</span>
                    <Badge className="bg-yellow-100 text-yellow-800">En cours</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Objectifs mensuels</span>
                    <Badge variant="outline">En attente</Badge>
                  </div>
                </div>
              </MaterialCardContent>
            </MaterialCard>
          </div>
        </div>
      ) : viewMode === 'zones' ? (
        <div className="space-y-6">
          {ZONES.map(zone => {
            // Intersection : items du zone ∩ items filtrés par catégorie.
            // Permet de garder la vue groupée par lieu de stockage tout
            // en respectant le chip catégorie actif (ex: "Légumes dans le Frigo").
            const filteredSet = new Set(filteredItems.map((i) => i.id));
            const zoneItems = inventoryByZones[zone.name].filter((i) => filteredSet.has(i.id));
            if (zoneItems.length === 0) return null;

            return (
              <motion.div
                key={zone.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{zone.icon}</span>
                  <h2 className="text-xl font-semibold">{zone.name}</h2>
                  <Badge variant="secondary">{zoneItems.length}</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {zoneItems.map(item => (
                    <SmartProductCard
                      key={item.id}
                      product={item}
                      onQuantityChange={handleQuantityChange}
                      onMoveToShoppingList={handleMoveToShoppingList}
                      onConsume={handleConsume}
                      onEdit={handleEdit}
                      onFindRecipes={handleFindRecipes}
                      onDiscard={handleDiscard}
                    />
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : viewMode === 'list' ? (
        // Vue liste compacte : une ligne par produit avec emoji catégorie,
        // nom, quantité, unité, péremption (badge) et actions inline.
        // Beaucoup plus dense que le card grid du mode "Grille".
        <MaterialCard variant="elevated">
          <MaterialCardContent className="p-0">
            <ul className="divide-y divide-border">
              {filteredItems.length === 0 ? (
                <li className="p-6 text-center text-sm text-muted-foreground">
                  Aucun produit dans cette catégorie.
                </li>
              ) : (
                filteredItems.map((item) => {
                  const catDef = CATEGORY_DEFS.find(
                    (d) => d.key === categorizeProduct(item.product?.category, item.product?.name),
                  );
                  const daysToExpiry = item.expiry_date
                    ? Math.ceil(
                        (new Date(item.expiry_date).getTime() - Date.now()) /
                          (24 * 60 * 60 * 1000),
                      )
                    : null;
                  const expiryTone =
                    daysToExpiry == null
                      ? 'text-muted-foreground'
                      : daysToExpiry < 0
                        ? 'text-red-600'
                        : daysToExpiry <= 3
                          ? 'text-orange-600'
                          : 'text-muted-foreground';
                  return (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 px-3 py-3 sm:px-4 hover:bg-muted/40 transition-colors"
                    >
                      <span className="text-2xl shrink-0" aria-hidden>
                        {catDef?.icon ?? '📦'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">
                          {item.product?.name ?? 'Produit'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {catDef?.label ?? 'Autres'}
                          {item.location ? ` · ${item.location}` : ''}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold tabular-nums">
                          {item.quantity}
                          {item.unit && item.unit !== 'unité' ? ` ${item.unit}` : ''}
                        </p>
                        {daysToExpiry != null && (
                          <p className={cn('text-xs tabular-nums', expiryTone)}>
                            {daysToExpiry < 0
                              ? `expiré il y a ${Math.abs(daysToExpiry)}j`
                              : daysToExpiry === 0
                                ? "expire aujourd'hui"
                                : `J-${daysToExpiry}`}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-1">
                        <MaterialButton
                          variant="text"
                          size="sm"
                          onClick={() => handleEdit(item)}
                          icon={<Pencil className="w-4 h-4" />}
                          aria-label={`Modifier ${item.product?.name ?? 'le produit'}`}
                          className="min-h-10 min-w-10"
                        />
                        <MaterialButton
                          variant="text"
                          size="sm"
                          onClick={() => handleDiscard(item)}
                          icon={<Trash2 className="w-4 h-4 text-red-600" />}
                          aria-label={`Jeter ${item.product?.name ?? 'le produit'}`}
                          className="min-h-10 min-w-10"
                        />
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </MaterialCardContent>
        </MaterialCard>
      ) : (
        // Vue grille (par défaut) : cartes produit denses, multi-colonnes.
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredItems.length === 0 ? (
            <p className="col-span-full text-center text-sm text-muted-foreground py-8">
              Aucun produit dans cette catégorie.
            </p>
          ) : (
            filteredItems.map((item) => (
              <SmartProductCard
                key={item.id}
                product={item}
                onQuantityChange={handleQuantityChange}
                onMoveToShoppingList={handleMoveToShoppingList}
                onConsume={handleConsume}
                onEdit={handleEdit}
                onFindRecipes={handleFindRecipes}
                onDiscard={handleDiscard}
              />
            ))
          )}
        </div>
      )}

      {/* Empty State */}
      {inventory.length === 0 && (
        <EmptyState
          icon={Package}
          title="Inventaire vide"
          description="Commence par ajouter tes premiers produits pour suivre ton garde-manger."
          action={{
            label: "Ajouter un produit",
            onClick: () => setAddDialogOpen(true),
          }}
        />
      )}

      {/* Floating Action Button */}
      {/* P1 polish: drop the `onReceiptScan` prop entirely — the
          handler used to surface a "Fonctionnalité bientôt disponible"
          toast. The FAB now hides the Ticket option until the OCR
          pipeline ships. */}
      <FloatingActionButton
        onCameraScan={() => setScannerOpen(true)}
        onVoiceInput={() => toast({ title: "Utilisez le bouton vocal en haut", description: "Le bouton vocal amélioré est maintenant dans la barre de recherche" })}
        onManualAdd={() => setAddDialogOpen(true)}
        onTextBulkAdd={() => setTextBulkDialogOpen(true)}
      />

      {/* Dialogs lazy-loaded — chunk fetch déclenché à la première
          ouverture, ensuite cache navigateur. Pas de fallback visible
          (les dialogs ouvrent leur propre overlay). */}
      <Suspense fallback={null}>
        {addDialogOpen && (
          <AddProductDialog
            open={addDialogOpen}
            onOpenChange={setAddDialogOpen}
          />
        )}

        {textBulkDialogOpen && (
          <TextBulkAddDialog
            open={textBulkDialogOpen}
            onOpenChange={setTextBulkDialogOpen}
          />
        )}

        {editingItem && (
          <EditItemDialog
            open={editDialogOpen}
            onOpenChange={(open) => {
              setEditDialogOpen(open);
              if (!open) setEditingItem(null);
            }}
            item={editingItem}
            onSubmit={updateInventory}
          />
        )}

        {discardingItem && (
          <DiscardItemDialog
            item={discardingItem}
            open={Boolean(discardingItem)}
            onOpenChange={(open) => {
              if (!open) setDiscardingItem(null);
            }}
            onConfirm={confirmDiscard}
          />
        )}

        {scannerOpen && (
          <MobileBarcodeScanner
            open={scannerOpen}
            onClose={() => setScannerOpen(false)}
            onScanSuccess={handleScanSuccess}
            mode="inventory"
          />
        )}
      </Suspense>
    </div>
  );
};

export default Inventory;