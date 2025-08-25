import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Moon, 
  Sun, 
  User, 
  Bell, 
  Shield, 
  HelpCircle,
  ChevronRight,
  PlayCircle,
  Palette,
  Languages,
  Smartphone,
  Database,
  LogOut,
  RefreshCw,
  Home
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useTutorial } from "@/hooks/useTutorial";
import { usePersonalization } from "@/hooks/usePersonalization";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PersonalizationSettings } from "@/components/settings/PersonalizationSettings";

const SettingsPage = () => {
  const { theme, setTheme } = useTheme();
  const { startTutorial } = useTutorial();
  const { preferences, resetPreferences } = usePersonalization();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showPersonalization, setShowPersonalization] = useState(false);

  const handleThemeToggle = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
    toast({
      title: "Thème modifié",
      description: `Mode ${theme === 'light' ? 'sombre' : 'clair'} activé.`
    });
  };

  const handleReplayTutorial = () => {
    startTutorial();
    navigate('/');
    toast({
      title: "Tutoriel redémarré",
      description: "Suivez les instructions pour redécouvrir l'application."
    });
  };

  const handleResetOnboarding = () => {
    if (window.confirm("Voulez-vous vraiment réinitialiser vos préférences et refaire l'onboarding ?")) {
      resetPreferences();
      localStorage.removeItem('hasCompletedOnboarding');
      navigate('/onboarding');
    }
  };

  const handleLogout = () => {
    if (window.confirm("Voulez-vous vraiment vous déconnecter ?")) {
      // Clear auth and redirect
      localStorage.clear();
      navigate('/auth');
    }
  };

  return (
    <Layout>
      <div className="p-4 space-y-4 pb-20 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Paramètres
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/insights')}
            className="gap-2"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Button>
        </div>

        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Apparence
            </CardTitle>
            <CardDescription>
              Personnalisez l'apparence de votre application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === 'light' ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-blue-500" />
                )}
                <div>
                  <Label htmlFor="theme-toggle">Mode sombre</Label>
                  <p className="text-sm text-muted-foreground">
                    {theme === 'light' ? 'Désactivé' : 'Activé'}
                  </p>
                </div>
              </div>
              <Switch
                id="theme-toggle"
                checked={theme === 'dark'}
                onCheckedChange={handleThemeToggle}
              />
            </div>

            <Separator />

            {/* Material You Demo */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Palette className="w-5 h-5 text-primary" />
                <div>
                  <Label>Material You Demo</Label>
                  <p className="text-sm text-muted-foreground">Testez le nouveau système de thème dynamique</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/demo/material-you')}
                className="gap-2"
              >
                <Palette className="w-4 h-4" />
                Découvrir
              </Button>
            </div>

            <Separator />

            {/* Language (future feature) */}
            <div className="flex items-center justify-between opacity-50">
              <div className="flex items-center gap-3">
                <Languages className="w-5 h-5" />
                <div>
                  <Label>Langue</Label>
                  <p className="text-sm text-muted-foreground">Français</p>
                </div>
              </div>
              <Badge variant="secondary">Bientôt</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Tutorial & Help */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Aide & Tutoriel
            </CardTitle>
            <CardDescription>
              Apprenez à utiliser toutes les fonctionnalités
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={handleReplayTutorial}
            >
              <span className="flex items-center gap-2">
                <PlayCircle className="w-4 h-4" />
                Revoir le tutoriel
              </span>
              <ChevronRight className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => setShowPersonalization(true)}
            >
              <span className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Modifier mes préférences
              </span>
              <ChevronRight className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={handleResetOnboarding}
            >
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Refaire l'onboarding
              </span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Gérez vos préférences de notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="expiry-notifications">Alertes de péremption</Label>
                <p className="text-sm text-muted-foreground">
                  Notifications pour les produits qui expirent bientôt
                </p>
              </div>
              <Switch id="expiry-notifications" defaultChecked />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="recipe-suggestions">Suggestions de recettes</Label>
                <p className="text-sm text-muted-foreground">
                  Notifications hebdomadaires de nouvelles recettes
                </p>
              </div>
              <Switch id="recipe-suggestions" defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Confidentialité & Données
            </CardTitle>
            <CardDescription>
              Gérez vos données personnelles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Exporter mes données
              </span>
              <ChevronRight className="w-4 h-4" />
            </Button>

            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Appareils connectés
              </span>
              <Badge variant="secondary">1 actif</Badge>
            </Button>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card className="border-destructive/20">
          <CardContent className="pt-6">
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Se déconnecter
            </Button>
          </CardContent>
        </Card>

        {/* Version Info */}
        <div className="text-center text-sm text-muted-foreground pt-4">
          <p>Smart Pantry Pro v2.0.0</p>
          <p>© 2024 - Tous droits réservés</p>
        </div>
      </div>

      {/* Personalization Modal */}
      {showPersonalization && (
        <PersonalizationSettings
          open={showPersonalization}
          onClose={() => setShowPersonalization(false)}
        />
      )}
    </Layout>
  );
};

export default SettingsPage;