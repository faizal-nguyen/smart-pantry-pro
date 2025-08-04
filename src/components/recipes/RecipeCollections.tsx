import { useState } from "react";
import { useRecipeCollections } from "@/hooks/useRecipeCollections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Folder, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Share2, 
  Copy, 
  Eye, 
  Heart,
  Search,
  Grid3x3,
  List,
  Lock,
  Globe,
  Users,
  Clock,
  BookOpen
} from "lucide-react";
import { RecipeCollection, CollectionFilters } from "@/types/recipe-collections";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const RecipeCollections = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCollection, setEditingCollection] = useState<RecipeCollection | null>(null);
  const [filters, setFilters] = useState<CollectionFilters>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTab, setSelectedTab] = useState('my-collections');
  
  const { toast } = useToast();
  const {
    collections,
    loading,
    createCollection,
    updateCollection,
    deleteCollection,
    duplicateCollection,
    searchPublicCollections
  } = useRecipeCollections();

  // Form state
  const [collectionForm, setCollectionForm] = useState({
    name: "",
    description: "",
    is_public: false,
    tags: [] as string[],
    newTag: ""
  });

  const resetForm = () => {
    setCollectionForm({
      name: "",
      description: "",
      is_public: false,
      tags: [],
      newTag: ""
    });
    setEditingCollection(null);
  };

  const handleCreateOrUpdate = async () => {
    if (!collectionForm.name.trim()) {
      toast({
        title: "Nom requis",
        description: "Veuillez entrer un nom pour la collection",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingCollection) {
        await updateCollection(editingCollection.id, {
          name: collectionForm.name,
          description: collectionForm.description,
          is_public: collectionForm.is_public,
          tags: collectionForm.tags
        });
      } else {
        await createCollection({
          name: collectionForm.name,
          description: collectionForm.description,
          is_public: collectionForm.is_public,
          tags: collectionForm.tags
        });
      }
      
      setShowCreateDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error saving collection:', error);
    }
  };

  const handleEdit = (collection: RecipeCollection) => {
    setEditingCollection(collection);
    setCollectionForm({
      name: collection.name,
      description: collection.description || "",
      is_public: collection.is_public,
      tags: collection.tags || [],
      newTag: ""
    });
    setShowCreateDialog(true);
  };

  const handleDelete = async (collection: RecipeCollection) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer "${collection.name}" ?`)) {
      await deleteCollection(collection.id);
    }
  };

  const handleDuplicate = async (collection: RecipeCollection) => {
    await duplicateCollection(collection.id);
  };

  const handleShare = (collection: RecipeCollection) => {
    // Copier le lien de partage
    const shareUrl = `${window.location.origin}/collections/${collection.share_code}`;
    navigator.clipboard.writeText(shareUrl);
    
    toast({
      title: "Lien copié !",
      description: "Le lien de partage a été copié dans le presse-papier",
    });
  };

  const addTag = () => {
    const tag = collectionForm.newTag.trim();
    if (tag && !collectionForm.tags.includes(tag)) {
      setCollectionForm({
        ...collectionForm,
        tags: [...collectionForm.tags, tag],
        newTag: ""
      });
    }
  };

  const removeTag = (tagToRemove: string) => {
    setCollectionForm({
      ...collectionForm,
      tags: collectionForm.tags.filter(tag => tag !== tagToRemove)
    });
  };

  // Filtrer les collections selon l'onglet
  const filteredCollections = collections.filter(collection => {
    if (selectedTab === 'my-collections') {
      return !collection.is_public;
    } else if (selectedTab === 'public') {
      return collection.is_public;
    }
    return true;
  });

  const CollectionCard = ({ collection }: { collection: RecipeCollection }) => (
    <Card className="group hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {collection.name}
              {collection.is_public ? (
                <Globe className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground" />
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              {collection.description || "Aucune description"}
            </CardDescription>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(collection)}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDuplicate(collection)}>
                <Copy className="h-4 w-4 mr-2" />
                Dupliquer
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare(collection)}>
                <Share2 className="h-4 w-4 mr-2" />
                Partager
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleDelete(collection)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              <span>{collection.recipe_count || 0} recettes</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{collection.view_count} vues</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              <span>{collection.favorite_count}</span>
            </div>
          </div>
          
          {/* Tags */}
          {collection.tags && collection.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {collection.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Metadata */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              Mis à jour {format(new Date(collection.updated_at), "d MMM yyyy", { locale: fr })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Collections de Recettes</h2>
          <p className="text-muted-foreground">
            Organisez vos recettes favorites en collections thématiques
          </p>
        </div>
        
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Collection
        </Button>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Rechercher des collections..."
              className="pl-10"
              value={filters.search || ""}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          
          <Select 
            value={filters.sortBy || "updated_at"} 
            onValueChange={(value: any) => setFilters({ ...filters, sortBy: value })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated_at">Plus récentes</SelectItem>
              <SelectItem value="name">Nom</SelectItem>
              <SelectItem value="recipe_count">Nombre de recettes</SelectItem>
              <SelectItem value="view_count">Plus populaires</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="my-collections">
            <Folder className="h-4 w-4 mr-2" />
            Mes Collections
          </TabsTrigger>
          <TabsTrigger value="public">
            <Globe className="h-4 w-4 mr-2" />
            Collections Publiques
          </TabsTrigger>
          <TabsTrigger value="shared">
            <Users className="h-4 w-4 mr-2" />
            Partagées avec moi
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : filteredCollections.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {selectedTab === 'my-collections' 
                  ? "Vous n'avez pas encore de collections"
                  : "Aucune collection trouvée"
                }
              </p>
              {selectedTab === 'my-collections' && (
                <Button 
                  onClick={() => setShowCreateDialog(true)}
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Créer votre première collection
                </Button>
              )}
            </div>
          ) : (
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
              : "space-y-4"
            }>
              {filteredCollections.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingCollection ? "Modifier la collection" : "Nouvelle collection"}
            </DialogTitle>
            <DialogDescription>
              {editingCollection 
                ? "Modifiez les informations de votre collection"
                : "Créez une nouvelle collection pour organiser vos recettes"
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Nom de la collection *</Label>
              <Input
                id="name"
                value={collectionForm.name}
                onChange={(e) => setCollectionForm({ ...collectionForm, name: e.target.value })}
                placeholder="Ex: Recettes d'été, Cuisine italienne..."
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={collectionForm.description}
                onChange={(e) => setCollectionForm({ ...collectionForm, description: e.target.value })}
                placeholder="Décrivez votre collection..."
                rows={3}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="public">Collection publique</Label>
                <p className="text-sm text-muted-foreground">
                  Les collections publiques sont visibles par tous
                </p>
              </div>
              <Switch
                id="public"
                checked={collectionForm.is_public}
                onCheckedChange={(checked) => setCollectionForm({ ...collectionForm, is_public: checked })}
              />
            </div>
            
            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Ajouter un tag..."
                  value={collectionForm.newTag}
                  onChange={(e) => setCollectionForm({ ...collectionForm, newTag: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button onClick={addTag} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {collectionForm.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer">
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-xs hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateOrUpdate}>
              {editingCollection ? "Enregistrer" : "Créer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecipeCollections;