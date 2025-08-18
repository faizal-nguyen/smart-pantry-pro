export interface StoreSection {
  id: string;
  name: string;
  icon: string;
  color: string;
  order: number;
  items?: ShoppingListItem[];
}

export interface ShoppingListItem {
  id: string;
  product_id: string;
  quantity: number;
  is_purchased: boolean;
  priority: number;
  estimated_price?: number;
  store_section?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  purchased_at?: string;
  product?: {
    id: string;
    name: string;
    category: string;
    unit_type: string;
  };
  // In-store mode specific fields
  shopping_pattern_order?: number;
  discount?: number;
}

export interface StoreLayout {
  id: string;
  name: string;
  description?: string;
  mode: 'auto-organize' | 'manual' | 'by-store';
  sections: StoreSection[];
  is_default?: boolean;
  created_at: string;
  updated_at: string;
}

export interface InStoreModeConfig {
  features: {
    largeButtons: boolean;
    voiceCheck: boolean;
    hapticFeedback: boolean;
    keepScreenOn: boolean;
    progressBar: boolean;
    smartReorder: boolean;
  };
  display: {
    checkedItems: 'strike-through' | 'hide' | 'move-bottom';
    showPrices: boolean;
    runningTotal: boolean;
  };
}

export interface ShoppingListCollaboration {
  id: string;
  shopping_list_id: string;
  shared_with_user_id: string;
  permissions: 'view' | 'edit' | 'admin';
  created_at: string;
  shared_by_user_id: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
  };
}

export interface SharedShoppingList {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  store_layout_id?: string;
  in_store_config: InStoreModeConfig;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
  items: ShoppingListItem[];
  collaborators: ShoppingListCollaboration[];
  store_layout?: StoreLayout;
}

export interface ShoppingPattern {
  user_id: string;
  store_section: string;
  typical_order: number;
  frequency: number;
  last_visited: string;
  average_time_spent: number; // in seconds
}

export interface LiveIndicator {
  user_id: string;
  user_name: string;
  avatar_url?: string;
  current_section?: string;
  is_active: boolean;
  last_seen: string;
}

export interface ShoppingListRealtimeEvent {
  type: 'item_added' | 'item_updated' | 'item_purchased' | 'item_removed' | 'user_joined' | 'user_left';
  payload: {
    item?: ShoppingListItem;
    user?: LiveIndicator;
    section?: string;
  };
  timestamp: string;
  user_id: string;
}

export const DEFAULT_STORE_SECTIONS: StoreSection[] = [
  {
    id: 'entrance',
    name: 'Entrée',
    icon: '🚪',
    color: 'bg-slate-100 text-slate-700',
    order: 1
  },
  {
    id: 'fruits-legumes',
    name: 'Fruits & Légumes',
    icon: '🥬',
    color: 'bg-green-100 text-green-700',
    order: 2
  },
  {
    id: 'boucherie-poissonnerie',
    name: 'Boucherie/Poissonnerie',
    icon: '🥩',
    color: 'bg-red-100 text-red-700',
    order: 3
  },
  {
    id: 'charcuterie-fromagerie',
    name: 'Charcuterie/Fromagerie',
    icon: '🧀',
    color: 'bg-orange-100 text-orange-700',
    order: 4
  },
  {
    id: 'epicerie-salee',
    name: 'Épicerie salée',
    icon: '🥫',
    color: 'bg-yellow-100 text-yellow-700',
    order: 5
  },
  {
    id: 'epicerie-sucree',
    name: 'Épicerie sucrée',
    icon: '🍯',
    color: 'bg-amber-100 text-amber-700',
    order: 6
  },
  {
    id: 'surgeles',
    name: 'Surgelés',
    icon: '🧊',
    color: 'bg-cyan-100 text-cyan-700',
    order: 7
  },
  {
    id: 'frais-produits-laitiers',
    name: 'Frais/Produits laitiers',
    icon: '🥛',
    color: 'bg-blue-100 text-blue-700',
    order: 8
  },
  {
    id: 'boissons',
    name: 'Boissons',
    icon: '🧃',
    color: 'bg-purple-100 text-purple-700',
    order: 9
  },
  {
    id: 'hygiene-beaute',
    name: 'Hygiène/Beauté',
    icon: '🧴',
    color: 'bg-pink-100 text-pink-700',
    order: 10
  },
  {
    id: 'maison-entretien',
    name: 'Maison/Entretien',
    icon: '🧽',
    color: 'bg-indigo-100 text-indigo-700',
    order: 11
  },
  {
    id: 'caisses',
    name: 'Caisses',
    icon: '💳',
    color: 'bg-gray-100 text-gray-700',
    order: 12
  }
];

export const DEFAULT_IN_STORE_CONFIG: InStoreModeConfig = {
  features: {
    largeButtons: true,
    voiceCheck: true,
    hapticFeedback: true,
    keepScreenOn: true,
    progressBar: true,
    smartReorder: true
  },
  display: {
    checkedItems: 'strike-through',
    showPrices: true,
    runningTotal: true
  }
};

// Type guards
export const isShoppingListItem = (item: any): item is ShoppingListItem => {
  return item && typeof item.id === 'string' && typeof item.product_id === 'string';
};

export const isStoreSection = (section: any): section is StoreSection => {
  return section && typeof section.id === 'string' && typeof section.name === 'string';
};