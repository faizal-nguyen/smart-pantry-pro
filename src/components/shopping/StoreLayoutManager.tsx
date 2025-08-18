import React, { useState } from 'react';
import { motion, Reorder } from 'framer-motion';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  GripVertical, 
  Store, 
  Copy, 
  Check,
  X,
  Settings,
  MapPin
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { StoreLayout, StoreSection, DEFAULT_STORE_SECTIONS } from '@/types/shopping-list';
import { useStoreLayout } from '@/hooks/useStoreLayoutLocal';
import { useToast } from '@/hooks/use-toast';

interface StoreLayoutManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLayoutSelect?: (layout: StoreLayout) => void;
}

const EMOJI_OPTIONS = [
  '🥬', '🥩', '🧀', '🥫', '🍯', '🧊', '🥛', '🧃', '🧴', '🧽', 
  '🍎', '🥖', '🐟', '🥚', '🍞', '🧈', '🍼', '🍷', '🧼', '🏠',
  '🚪', '💳', '📦', '🛒', '🎯', '⭐', '🔥', '❄️', '🌿', '🏷️'
];

const COLOR_OPTIONS = [
  { name: 'Gris', value: 'bg-gray-100 text-gray-700' },
  { name: 'Vert', value: 'bg-green-100 text-green-700' },
  { name: 'Rouge', value: 'bg-red-100 text-red-700' },
  { name: 'Orange', value: 'bg-orange-100 text-orange-700' },
  { name: 'Jaune', value: 'bg-yellow-100 text-yellow-700' },
  { name: 'Amber', value: 'bg-amber-100 text-amber-700' },
  { name: 'Cyan', value: 'bg-cyan-100 text-cyan-700' },
  { name: 'Bleu', value: 'bg-blue-100 text-blue-700' },
  { name: 'Violet', value: 'bg-purple-100 text-purple-700' },
  { name: 'Rose', value: 'bg-pink-100 text-pink-700' },
  { name: 'Indigo', value: 'bg-indigo-100 text-indigo-700' }
];

const StoreLayoutManager: React.FC<StoreLayoutManagerProps> = ({
  open,
  onOpenChange,
  onLayoutSelect
}) => {
  const [activeTab, setActiveTab] = useState<'layouts' | 'sections'>('layouts');
  const [editingLayout, setEditingLayout] = useState<StoreLayout | null>(null);
  const [editingSection, setEditingSection] = useState<StoreSection | null>(null);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [newLayoutDescription, setNewLayoutDescription] = useState('');
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>('');

  const {
    layouts,
    activeLayout,
    loading,
    createLayout,
    updateLayout,
    deleteLayout,
    setDefaultLayout,
    updateSectionOrder,
    addSection,
    updateSection,
    deleteSection,
    getSectionsByLayout,
    duplicateLayout
  } = useStoreLayout();

  const { toast } = useToast();

  const handleCreateLayout = async () => {
    if (!newLayoutName.trim()) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le nom de la configuration est requis."
      });
      return;
    }

    const layout = await createLayout(newLayoutName, newLayoutDescription);
    if (layout) {
      setNewLayoutName('');
      setNewLayoutDescription('');
      toast({
        title: "Configuration créée",
        description: `La configuration "${newLayoutName}" a été créée.`
      });
    }
  };

  const handleDuplicateLayout = async (layoutId: string) => {
    const originalLayout = layouts.find(l => l.id === layoutId);
    if (!originalLayout) return;

    const newName = `${originalLayout.name} (copie)`;
    await duplicateLayout(layoutId, newName);
  };

  const handleSectionReorder = async (layoutId: string, reorderedSections: StoreSection[]) => {
    for (let i = 0; i < reorderedSections.length; i++) {
      const section = reorderedSections[i];
      if (section.order !== i + 1) {
        await updateSectionOrder(layoutId, section.id, i + 1);
      }
    }
  };

  const SectionEditor = ({ section, layoutId }: { section: StoreSection | null, layoutId: string }) => {
    const [name, setName] = useState(section?.name || '');
    const [icon, setIcon] = useState(section?.icon || '📦');
    const [color, setColor] = useState(section?.color || 'bg-gray-100 text-gray-700');

    const handleSave = async () => {
      if (!name.trim()) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Le nom du rayon est requis."
        });
        return;
      }

      if (section) {
        await updateSection(section.id, { name, icon, color });
      } else {
        const maxOrder = Math.max(...getSectionsByLayout(layoutId).map(s => s.order), 0);
        await addSection(layoutId, { name, icon, color, order: maxOrder + 1 });
      }
      
      setEditingSection(null);
    };

    return (
      <Dialog open={!!editingSection} onOpenChange={(open) => !open && setEditingSection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {section ? 'Modifier le rayon' : 'Ajouter un rayon'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="section-name">Nom du rayon</Label>
              <Input
                id="section-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Fruits & Légumes"
              />
            </div>

            <div>
              <Label>Icône</Label>
              <div className="grid grid-cols-10 gap-2 mt-2">
                {EMOJI_OPTIONS.map(emoji => (
                  <Button
                    key={emoji}
                    variant={icon === emoji ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIcon(emoji)}
                    className="text-lg"
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label>Couleur</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {COLOR_OPTIONS.map(colorOption => (
                  <Button
                    key={colorOption.value}
                    variant={color === colorOption.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setColor(colorOption.value)}
                    className="justify-start"
                  >
                    <div className={cn("w-4 h-4 rounded mr-2", colorOption.value)} />
                    {colorOption.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div>
              <Label>Aperçu</Label>
              <Badge className={cn("mt-2", color)}>
                <span className="mr-2">{icon}</span>
                {name || 'Nom du rayon'}
              </Badge>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSection(null)}>
              Annuler
            </Button>
            <Button onClick={handleSave}>
              {section ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Configuration des magasins
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          <Button
            variant={activeTab === 'layouts' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('layouts')}
            className="flex-1"
          >
            Configurations
          </Button>
          <Button
            variant={activeTab === 'sections' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('sections')}
            className="flex-1"
          >
            Rayons
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          {activeTab === 'layouts' ? (
            <div className="space-y-6">
              {/* Create new layout */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Nouvelle configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="layout-name">Nom</Label>
                    <Input
                      id="layout-name"
                      value={newLayoutName}
                      onChange={(e) => setNewLayoutName(e.target.value)}
                      placeholder="Ex: Carrefour République"
                    />
                  </div>
                  <div>
                    <Label htmlFor="layout-description">Description (optionnelle)</Label>
                    <Textarea
                      id="layout-description"
                      value={newLayoutDescription}
                      onChange={(e) => setNewLayoutDescription(e.target.value)}
                      placeholder="Ex: Configuration pour le Carrefour du centre-ville"
                      rows={2}
                    />
                  </div>
                  <Button onClick={handleCreateLayout} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Créer la configuration
                  </Button>
                </CardContent>
              </Card>

              {/* Existing layouts */}
              <div className="space-y-4">
                {layouts.map((layout) => (
                  <Card key={layout.id} className={cn(
                    "transition-all",
                    layout.is_default && "ring-2 ring-primary"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{layout.name}</h3>
                            {layout.is_default && (
                              <Badge variant="default">Par défaut</Badge>
                            )}
                          </div>
                          {layout.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {layout.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span>{layout.sections.length} rayons</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!layout.is_default && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDefaultLayout(layout.id)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDuplicateLayout(layout.id)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>

                          {onLayoutSelect && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                onLayoutSelect(layout);
                                onOpenChange(false);
                              }}
                            >
                              Sélectionner
                            </Button>
                          )}

                          {!layout.is_default && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteLayout(layout.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Layout selector */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Modifier les rayons</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label htmlFor="layout-select">Configuration</Label>
                      <Select value={selectedLayoutId} onValueChange={setSelectedLayoutId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une configuration" />
                        </SelectTrigger>
                        <SelectContent>
                          {layouts.map((layout) => (
                            <SelectItem key={layout.id} value={layout.id}>
                              {layout.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedLayoutId && (
                      <Button
                        onClick={() => setEditingSection({} as StoreSection)}
                        className="self-end"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Sections list */}
              {selectedLayoutId && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Rayons</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Glissez-déposez pour réorganiser l'ordre des rayons
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Reorder.Group
                      axis="y"
                      values={getSectionsByLayout(selectedLayoutId)}
                      onReorder={(reorderedSections) => 
                        handleSectionReorder(selectedLayoutId, reorderedSections)
                      }
                      className="space-y-2"
                    >
                      {getSectionsByLayout(selectedLayoutId).map((section) => (
                        <Reorder.Item
                          key={section.id}
                          value={section}
                          className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-grab active:cursor-grabbing"
                        >
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          
                          <Badge className={cn(section.color, "flex-shrink-0")}>
                            <span className="mr-2">{section.icon}</span>
                            {section.name}
                          </Badge>

                          <div className="flex-1" />

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingSection(section)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteSection(section.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Section editor */}
        <SectionEditor 
          section={editingSection} 
          layoutId={selectedLayoutId} 
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StoreLayoutManager;