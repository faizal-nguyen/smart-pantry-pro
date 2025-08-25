/**
 * Gestionnaire de collections personnelles
 * Permet de créer, modifier et organiser les collections de recettes
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus,
  Folder,
  Edit3,
  Trash2,
  Save,
  X,
  Palette,
  Tag,
  BookOpen,
  Heart,
  Star,
  Clock,
  Users,
  ChefHat,
  Sparkles,
  Grid3X3
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

import { useUserCollections } from '@/hooks/useUserRecipes';

interface CollectionDialogProps {
  collection?: {
    id: string;
    name: string;
    description?: string;
    color: string;
    icon: string;
    recipe_count: number;
  };
  isOpen: boolean;
  onClose: () => void;
}

// Couleurs et icônes prédéfinies pour les collections
const COLLECTION_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6366F1', // Indigo
];

const COLLECTION_ICONS = [
  { name: 'folder', icon: Folder, label: 'Dossier' },
  { name: 'heart', icon: Heart, label: 'Favoris' },
  { name: 'star', icon: Star, label: 'Étoile' },
  { name: 'chef-hat', icon: ChefHat, label: 'Chef' },
  { name: 'clock', icon: Clock, label: 'Rapide' },
  { name: 'users', icon: Users, label: 'Famille' },
  { name: 'sparkles', icon: Sparkles, label: 'Spécial' },
  { name: 'book-open', icon: BookOpen, label: 'Livre' },
];

export default function CollectionsManager() {
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const {
    collections,
    isLoading,
    createCollection,
    updateCollection,
    deleteCollection,
    isCreating,
    isUpdating,
    isDeleting
  } = useUserCollections();

  const handleCreateCollection = (collectionData: {
    name: string;
    description?: string;
    color: string;
    icon: string;
  }) => {
    createCollection(collectionData);
    setIsCreateDialogOpen(false);
    toast({
      title: "Collection créée !",
      description: `La collection "${collectionData.name}" a été créée avec succès.`,
    });
  };

  const handleUpdateCollection = (collectionId: string, updates: any) => {
    updateCollection({ collectionId, updates });
    setIsEditDialogOpen(false);
    setSelectedCollection(null);
    toast({
      title: "Collection mise à jour !",
      description: "Les modifications ont été sauvegardées.",
    });
  };

  const handleDeleteCollection = (collectionId: string, collectionName: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la collection "${collectionName}" ?`)) {
      deleteCollection(collectionId);
      toast({
        title: "Collection supprimée",
        description: `"${collectionName}" a été supprimée. Les recettes ne sont pas affectées.`,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header avec bouton création */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Collections</h2>
          <p className="text-gray-600">Organisez vos recettes par thèmes</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle collection
            </Button>
          </DialogTrigger>
          <CollectionDialog
            isOpen={isCreateDialogOpen}
            onClose={() => setIsCreateDialogOpen(false)}
            onSave={handleCreateCollection}
            isLoading={isCreating}
          />
        </Dialog>
      </div>

      {/* Liste des collections */}
      {isLoading ? (
        <CollectionsSkeleton />
      ) : collections.length === 0 ? (
        <EmptyCollectionsState onCreateFirst={() => setIsCreateDialogOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              onEdit={(collection) => {
                setSelectedCollection(collection);
                setIsEditDialogOpen(true);
              }}
              onDelete={(id, name) => handleDeleteCollection(id, name)}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      )}

      {/* Dialog d'édition */}
      {selectedCollection && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <CollectionDialog
            collection={selectedCollection}
            isOpen={isEditDialogOpen}
            onClose={() => {
              setIsEditDialogOpen(false);
              setSelectedCollection(null);
            }}
            onSave={(data) => handleUpdateCollection(selectedCollection.id, data)}
            isLoading={isUpdating}
          />
        </Dialog>
      )}
    </div>
  );
}

// ====================================================================
// SOUS-COMPOSANTS
// ====================================================================

function CollectionCard({ 
  collection, 
  onEdit, 
  onDelete,
  isDeleting 
}: { 
  collection: any;
  onEdit: (collection: any) => void;
  onDelete: (id: string, name: string) => void;
  isDeleting: boolean;
}) {
  const IconComponent = COLLECTION_ICONS.find(icon => icon.name === collection.icon)?.icon || Folder;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: collection.color + '20', color: collection.color }}
              >
                <IconComponent className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">{collection.name}</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {collection.recipe_count} recette{collection.recipe_count !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(collection)}
                className="h-8 w-8 p-0"
              >
                <Edit3 className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(collection.id, collection.name)}
                disabled={isDeleting}
                className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {collection.description && (
          <CardContent className="pt-0">
            <p className="text-sm text-gray-600 line-clamp-2">
              {collection.description}
            </p>
          </CardContent>
        )}
      </Card>
    </motion.div>
  );
}

function CollectionDialog({ 
  collection, 
  isOpen, 
  onClose,
  onSave,
  isLoading 
}: {
  collection?: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isLoading?: boolean;
}) {
  const [name, setName] = useState(collection?.name || '');
  const [description, setDescription] = useState(collection?.description || '');
  const [selectedColor, setSelectedColor] = useState(collection?.color || COLLECTION_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(collection?.icon || 'folder');

  const isEdit = !!collection;

  const handleSave = () => {
    if (!name.trim()) {
      toast({
        title: "Nom requis",
        description: "Veuillez saisir un nom pour la collection.",
        variant: "destructive",
      });
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      color: selectedColor,
      icon: selectedIcon,
    });
  };

  const SelectedIconComponent = COLLECTION_ICONS.find(icon => icon.name === selectedIcon)?.icon || Folder;

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          {isEdit ? 'Modifier la collection' : 'Nouvelle collection'}
        </DialogTitle>
        <DialogDescription>
          {isEdit 
            ? 'Modifiez les informations de votre collection.'
            : 'Créez une nouvelle collection pour organiser vos recettes.'
          }
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-6 py-4">
        {/* Prévisualisation */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed">
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: selectedColor + '20', color: selectedColor }}
            >
              <SelectedIconComponent className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {name || 'Nom de la collection'}
              </h3>
              {description && (
                <p className="text-sm text-gray-600 mt-1">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Nom */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Nom *</label>
          <Input
            placeholder="Ex: Favoris d'été, Cuisine italienne..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <Textarea
            placeholder="Description optionnelle de votre collection"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={200}
          />
        </div>

        {/* Couleur */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Couleur</label>
          <div className="flex gap-2 flex-wrap">
            {COLLECTION_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  selectedColor === color 
                    ? 'border-gray-400 scale-110' 
                    : 'border-gray-200 hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Icône */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Icône</label>
          <div className="grid grid-cols-4 gap-2">
            {COLLECTION_ICONS.map((iconOption) => {
              const IconComponent = iconOption.icon;
              const isSelected = selectedIcon === iconOption.name;
              
              return (
                <button
                  key={iconOption.name}
                  onClick={() => setSelectedIcon(iconOption.name)}
                  className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <IconComponent className="h-5 w-5" />
                  <span className="text-xs text-gray-600">{iconOption.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button 
          onClick={handleSave}
          disabled={isLoading || !name.trim()}
        >
          {isLoading ? (
            <>Sauvegarde...</>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {isEdit ? 'Modifier' : 'Créer'}
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function CollectionsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="h-32">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-200 rounded-lg animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-20" />
              </div>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

function EmptyCollectionsState({ onCreateFirst }: { onCreateFirst: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-12"
    >
      <div className="max-w-sm mx-auto">
        <div className="relative mb-6">
          <Grid3X3 className="h-16 w-16 text-gray-300 mx-auto" />
          <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-1">
            <Plus className="h-4 w-4" />
          </div>
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Aucune collection créée
        </h3>
        <p className="text-gray-600 mb-6">
          Organisez vos recettes en créant des collections thématiques comme "Favoris d'été" ou "Cuisine rapide".
        </p>
        
        <Button onClick={onCreateFirst}>
          <Plus className="h-4 w-4 mr-2" />
          Créer ma première collection
        </Button>
        
        <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <Tag className="h-4 w-4" />
            <span>Organisez par thèmes</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <Palette className="h-4 w-4" />
            <span>Personnalisez l'apparence</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}