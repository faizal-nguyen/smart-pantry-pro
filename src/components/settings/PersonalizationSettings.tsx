import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePersonalization } from "@/hooks/usePersonalization";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Utensils, 
  ChefHat, 
  Target,
  Home,
  Leaf,
  Wheat,
  Milk,
  Save
} from "lucide-react";

interface PersonalizationSettingsProps {
  open: boolean;
  onClose: () => void;
}

export const PersonalizationSettings = ({ open, onClose }: PersonalizationSettingsProps) => {
  const { preferences, updatePreferences } = usePersonalization();
  const { toast } = useToast();
  
  // Local state for editing
  const [householdSize, setHouseholdSize] = useState(preferences.householdSize || 'Solo');
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>(preferences.dietaryPreferences || []);
  const [cookingLevel, setCookingLevel] = useState(preferences.cookingLevel || 50);
  const [goals, setGoals] = useState<string[]>(preferences.goals || []);

  const householdOptions = [
    { value: 'Solo', label: 'Solo', icon: Home },
    { value: '2 personnes', label: '2 personnes', icon: Users },
    { value: '3-4', label: '3-4 personnes', icon: Users },
    { value: '5+', label: '5+ personnes', icon: Users }
  ];

  const dietaryOptions = [
    { id: 'vegetarian', label: 'Végétarien', icon: Leaf },
    { id: 'vegan', label: 'Vegan', icon: Leaf },
    { id: 'gluten-free', label: 'Sans gluten', icon: Wheat },
    { id: 'lactose-free', label: 'Sans lactose', icon: Milk }
  ];

  const goalOptions = [
    'Réduire le gaspillage',
    'Économiser de l\'argent',
    'Manger plus sainement',
    'Gagner du temps',
    'Découvrir de nouvelles recettes'
  ];

  const handleDietaryToggle = (diet: string) => {
    setDietaryPreferences(prev => 
      prev.includes(diet) 
        ? prev.filter(d => d !== diet)
        : [...prev, diet]
    );
  };

  const handleGoalToggle = (goal: string) => {
    setGoals(prev => 
      prev.includes(goal)
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  };

  const handleSave = () => {
    updatePreferences({
      householdSize,
      dietaryPreferences,
      cookingLevel,
      goals
    });
    
    toast({
      title: "Préférences mises à jour",
      description: "Vos préférences ont été enregistrées avec succès."
    });
    
    onClose();
  };

  const getCookingLevelLabel = (level: number) => {
    if (level < 33) return 'Débutant';
    if (level < 66) return 'Intermédiaire';
    return 'Expert';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Personnalisation</DialogTitle>
          <DialogDescription>
            Modifiez vos préférences pour une expérience personnalisée
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="household" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="household">Foyer</TabsTrigger>
            <TabsTrigger value="dietary">Régime</TabsTrigger>
            <TabsTrigger value="cooking">Cuisine</TabsTrigger>
            <TabsTrigger value="goals">Objectifs</TabsTrigger>
          </TabsList>

          <TabsContent value="household" className="space-y-4">
            <div className="space-y-2">
              <Label>Taille du foyer</Label>
              <p className="text-sm text-muted-foreground">
                Combien de personnes vivent dans votre foyer ?
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {householdOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <Card
                    key={option.value}
                    className={`cursor-pointer transition-all ${
                      householdSize === option.value
                        ? 'ring-2 ring-primary'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setHouseholdSize(option.value)}
                  >
                    <CardContent className="flex items-center gap-3 p-4">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                      <span className="font-medium">{option.label}</span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="dietary" className="space-y-4">
            <div className="space-y-2">
              <Label>Préférences alimentaires</Label>
              <p className="text-sm text-muted-foreground">
                Sélectionnez vos restrictions ou préférences alimentaires
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {dietaryOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = dietaryPreferences.includes(option.id);
                
                return (
                  <Card
                    key={option.id}
                    className={`cursor-pointer transition-all ${
                      isSelected
                        ? 'ring-2 ring-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleDietaryToggle(option.id)}
                  >
                    <CardContent className="flex items-center gap-3 p-4">
                      <Icon className={`w-5 h-5 ${
                        isSelected ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                      <span className="font-medium">{option.label}</span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="cooking" className="space-y-4">
            <div className="space-y-2">
              <Label>Niveau en cuisine</Label>
              <p className="text-sm text-muted-foreground">
                Évaluez votre niveau de compétence en cuisine
              </p>
            </div>
            
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-center gap-4">
                  <ChefHat className={`w-12 h-12 transition-colors ${
                    cookingLevel < 33 ? 'text-muted-foreground' :
                    cookingLevel < 66 ? 'text-primary/70' :
                    'text-primary'
                  }`} />
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {getCookingLevelLabel(cookingLevel)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Niveau {Math.round(cookingLevel)}%
                    </p>
                  </div>
                </div>
                
                <Slider
                  value={[cookingLevel]}
                  onValueChange={([value]) => setCookingLevel(value)}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
                
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Débutant</span>
                  <span>Intermédiaire</span>
                  <span>Expert</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="goals" className="space-y-4">
            <div className="space-y-2">
              <Label>Vos objectifs</Label>
              <p className="text-sm text-muted-foreground">
                Qu'est-ce qui est le plus important pour vous ?
              </p>
            </div>
            
            <div className="space-y-2">
              {goalOptions.map((goal) => {
                const isSelected = goals.includes(goal);
                
                return (
                  <Card
                    key={goal}
                    className={`cursor-pointer transition-all ${
                      isSelected
                        ? 'ring-2 ring-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleGoalToggle(goal)}
                  >
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <Target className={`w-4 h-4 ${
                          isSelected ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                        <span className="font-medium">{goal}</span>
                      </div>
                      {isSelected && (
                        <Badge variant="default" className="text-xs">
                          Sélectionné
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};