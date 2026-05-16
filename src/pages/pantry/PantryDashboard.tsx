/**
 * PantryDashboard - Dashboard principal du garde-manger
 * Vue d'ensemble de l'inventaire avec mode famille
 */

import React, { useMemo, useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Package, Bell, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useAgeAdaptiveUI } from '@/hooks/useFamilyMode';
import AppNavigation from '@/components/navigation/AppNavigation';
import { PageLoader } from '@/components/layout/PageLoader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useInventory } from '@/hooks/useInventory';
import { Autocomplete, AutocompleteSuggestion } from '@/components/ui/Autocomplete';
import { useToast } from '@/hooks/use-toast';

const PantryDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { adaptiveInterface, isChildMode } = useAgeAdaptiveUI();

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const { inventory, products, addToInventory } = useInventory();
  const { toast } = useToast();
  const [quick, setQuick] = useState({ name: '', qty: 1, unit: 'pcs' });
  const [openAuto, setOpenAuto] = useState(false);

  const toConsume = useMemo(() => {
    const now = Date.now();
    return (inventory || [])
      .filter(it => it.expiry_date)
      .map(it => ({
        ...it,
        days: Math.ceil((new Date(it.expiry_date as string).getTime() - now) / (1000*60*60*24))
      }))
      .filter(it => it.days <= 3)
      .sort((a,b) => a.days - b.days);
  }, [inventory]);

  const addedThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return (inventory || []).filter(it => {
      const ts = (it as any).created_at ? new Date((it as any).created_at).getTime() : NaN;
      return Number.isFinite(ts) && ts >= weekAgo;
    }).length;
  }, [inventory]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };
    getUser();
  }, []);

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quick.name.trim() || quick.qty <= 0) return;
    try {
      const product = await supabase
        .from('products')
        .select('*')
        .ilike('name', quick.name.trim())
        .maybeSingle();

      let productId = product.data?.id;
      if (!productId) {
        const { data: created, error } = await supabase
          .from('products')
          .insert({ name: quick.name.trim(), category: 'Général', unit_type: quick.unit })
          .select()
          .single();
        if (error) throw error;
        productId = created.id;
      }

      const createdInv = await addToInventory({
        product_id: productId!,
        quantity: quick.qty,
        expiry_date: undefined,
        location: 'pantry'
      } as any);

      setQuick({ name: '', qty: 1, unit: quick.unit });
      const undoTimer = setTimeout(() => {}, 5000);
      toast({
        title: 'Produit ajouté',
        description: `${createdInv?.product?.name || quick.name} ajouté à l'inventaire.`,
        action: {
          label: 'Annuler',
          onClick: async () => {
            clearTimeout(undoTimer);
            try {
              await supabase.from('inventory').delete().eq('id', createdInv.id);
            } catch {}
          }
        }
      });
    } catch (error) {
      console.error('Quick add error', error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'ajouter le produit.' });
    }
  };

  const quickActions = [
    {
      title: isChildMode ? 'Voir mes produits' : 'Inventaire',
      description: 'Gérer tous vos produits',
      icon: Package,
      path: '/pantry/inventory',
      color: 'bg-green-500'
    }
  ];

  return (
    <AppNavigation user={user}>
      <div className={cn(
        "p-4 space-y-6",
        isChildMode && "p-6 space-y-8"
      )}>
        <div>
          <h1 className={cn(
            "text-2xl font-bold text-foreground mb-2",
            isChildMode && "text-3xl"
          )}>
            {isChildMode ? 'Ma Réserve Magique 🏠' : 'Garde-Manger'}
          </h1>
          <p className={cn(
            "text-muted-foreground",
            isChildMode && "text-lg"
          )}>
            {isChildMode ? 
              'Découvre tous tes produits et garde-les frais!' :
              'Gérez votre inventaire alimentaire intelligemment'
            }
          </p>
        </div>

      {/* Actions rapides */}
      <div className={cn(
        "grid gap-4",
        isChildMode ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      )}>
        {quickActions.map((action) => {
          const IconComponent = action.icon;
          
          return (
            <Card
              key={action.path}
              className={cn(
                "cursor-pointer hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-primary/20",
                isChildMode && "p-2"
              )}
              onClick={() => navigate(action.path)}
            >
              <CardHeader className={cn(
                "pb-3",
                isChildMode && "pb-4"
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    `${action.color} p-2 rounded-lg text-white`,
                    isChildMode && "p-3"
                  )}>
                    <IconComponent className={cn(
                      "w-5 h-5",
                      isChildMode && "w-6 h-6"
                    )} />
                  </div>
                  <div>
                    <CardTitle className={cn(
                      "text-lg",
                      isChildMode && "text-xl"
                    )}>
                      {action.title}
                    </CardTitle>
                    {!adaptiveInterface.simplifiedNavigation && (
                      <CardDescription className={cn(
                        isChildMode && "text-base"
                      )}>
                        {action.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Quick Add */}
      <Card>
        <CardHeader>
          <CardTitle>Ajout rapide</CardTitle>
          <CardDescription>Ajouter un produit en 2 secondes</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleQuickAdd} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px] relative">
              <label className="block text-sm text-muted-foreground mb-1">Produit</label>
              <Autocomplete
                value={quick.name}
                onValueChange={(name) => {
                  setQuick(q => ({ ...q, name }));
                }}
                suggestions={(products || []).map(p => ({
                  id: p.id,
                  label: p.name,
                  value: p.name,
                  section: p.category || 'Autres',
                  meta: p.unit_type || undefined,
                  payload: p
                }) as AutocompleteSuggestion)}
                onSelect={(s) => {
                  setQuick(q => ({ ...q, name: s.value, unit: s.meta || q.unit }));
                }}
                placeholder="ex: Tomates"
                className="relative"
                inputClassName="w-full border rounded px-3 py-2"
                open={openAuto}
                onOpenChange={setOpenAuto}
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Quantité</label>
              <input
                type="number"
                value={quick.qty}
                min={0}
                onChange={e => setQuick(q => ({ ...q, qty: Number(e.target.value) }))}
                className="w-24 border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Unité</label>
              <select
                value={quick.unit}
                onChange={e => setQuick(q => ({ ...q, unit: e.target.value }))}
                className="border rounded px-3 py-2"
              >
                <option value="pcs">pcs</option>
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="L">L</option>
                <option value="ml">ml</option>
              </select>
            </div>
            <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded disabled:opacity-50" disabled={!quick.name.trim() || quick.qty <= 0}>
              Ajouter
            </button>
          </form>
          {(!quick.name.trim() || quick.qty <= 0) && (
            <p className="text-xs text-muted-foreground mt-2">
              {!quick.name.trim() ? 'Indiquez un nom de produit.' : 'La quantité doit être supérieure à 0.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Statistiques rapides — données réelles seulement (PRP-229 Commit 4).
          La carte "Économies" a été supprimée : pas de source de données fiable. */}
      <div className="grid gap-4 grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <span className={cn(
                "text-sm text-muted-foreground",
                isChildMode && "text-base"
              )}>
                {isChildMode ? 'Produits' : 'Total produits'}
              </span>
            </div>
            <p className={cn(
              "text-2xl font-bold text-primary mt-1",
              isChildMode && "text-3xl"
            )}>
              {(inventory || []).length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" />
              <span className={cn(
                "text-sm text-muted-foreground",
                isChildMode && "text-base"
              )}>
                {isChildMode ? 'À surveiller' : 'Bientôt périmés'}
              </span>
            </div>
            <p className={cn(
              "text-2xl font-bold text-amber-600 mt-1",
              isChildMode && "text-3xl"
            )}>
              {toConsume.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-500" />
              <span className={cn(
                "text-sm text-muted-foreground",
                isChildMode && "text-base"
              )}>
                {isChildMode ? 'Ajoutés' : 'Ajouts semaine'}
              </span>
            </div>
            <p className={cn(
              "text-2xl font-bold text-blue-600 mt-1",
              isChildMode && "text-3xl"
            )}>
              {addedThisWeek}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* À consommer d'abord */}
      <Card>
        <CardHeader>
          <CardTitle>À consommer d'abord</CardTitle>
          <CardDescription>Produits expirés / J‑1 / J‑3</CardDescription>
        </CardHeader>
        <CardContent>
          {toConsume.length === 0 ? (
            <p className="text-sm text-muted-foreground">Rien à signaler 🎉</p>
          ) : (
            <ul className="divide-y">
              {toConsume.slice(0, 8).map((it) => (
                <li key={it.id} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{it.product?.name || 'Produit'}</div>
                    <div className="text-xs text-muted-foreground">
                      {it.days <= 0 ? 'Expiré' : `Dans ${it.days} jour(s)`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="text-xs border rounded px-2 py-1"
                      onClick={() => navigate('/kitchen/recipes')}
                    >Proposer recette</button>
                    <button
                      className="text-xs border rounded px-2 py-1"
                      onClick={() => navigate('/kitchen/meal-planning')}
                    >Planifier</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Message d'encouragement pour enfants */}
      {isChildMode && (
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-lg font-medium text-green-700 mb-2">
                Super travail ! 🌟
              </p>
              <p className="text-green-600">
                Tu as bien géré tes produits cette semaine. Continue comme ça !
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </AppNavigation>
  );
};

export default PantryDashboard;
