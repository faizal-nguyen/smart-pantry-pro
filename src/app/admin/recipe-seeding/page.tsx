"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RecipeSeedingOrchestrator, SeedingProgress } from "@/services/recipe-seeding/seeding-orchestrator";
import { Loader2, PlayCircle, CheckCircle2, AlertCircle } from "lucide-react";

export default function RecipeSeedingPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<SeedingProgress | null>(null);
  const [result, setResult] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const startSeeding = async () => {
    setIsRunning(true);
    setResult(null);
    setLogs([]);
    addLog("🚀 Démarrage du seeding des recettes...");

    const orchestrator = new RecipeSeedingOrchestrator();
    
    // Configurer le callback de progression
    orchestrator.onProgress((progress) => {
      setProgress(progress);
      addLog(`${progress.phase}: ${progress.message}`);
    });

    try {
      const seedingResult = await orchestrator.seedRecipes();
      setResult(seedingResult);
      
      if (seedingResult.success) {
        addLog(`✅ Succès! ${seedingResult.recipesImported} recettes importées.`);
        addLog(`💰 Coût total: €${seedingResult.totalCost.toFixed(2)}`);
      } else {
        addLog(`❌ Échec du seeding.`);
      }
      
      if (seedingResult.errors.length > 0) {
        seedingResult.errors.forEach(err => addLog(`⚠️ ${err}`));
      }
      
    } catch (error) {
      console.error("Erreur seeding:", error);
      addLog(`❌ Erreur fatale: ${error.message}`);
      setResult({
        success: false,
        recipesImported: 0,
        totalCost: 0,
        errors: [error.message]
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getProgressPercentage = () => {
    if (!progress) return 0;
    return Math.round((progress.current / progress.total) * 100);
  };

  const getPhaseLabel = (phase: string) => {
    const labels: Record<string, string> = {
      scraping: "🔍 Extraction des recettes",
      translation: "🌐 Traduction en français",
      validation: "🔒 Validation sécurité alimentaire",
      import: "💾 Import dans la base de données",
      complete: "✅ Terminé"
    };
    return labels[phase] || phase;
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>🥘 Recipe Database Seeding - Phase 1</CardTitle>
          <CardDescription>
            Import de 50 recettes indiennes depuis Kannamma Cooks avec traduction française
            et validation de sécurité alimentaire.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bouton de démarrage */}
          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={startSeeding}
              disabled={isRunning}
              className="w-full max-w-md"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Seeding en cours...
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Démarrer le seeding (50 recettes)
                </>
              )}
            </Button>
          </div>

          {/* Progression */}
          {progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{getPhaseLabel(progress.phase)}</span>
                <span>{progress.current}/{progress.total}</span>
              </div>
              <Progress value={getProgressPercentage()} className="h-3" />
              <p className="text-sm text-muted-foreground">{progress.message}</p>
            </div>
          )}

          {/* Résultat */}
          {result && (
            <Alert className={result.success ? "border-green-500" : "border-red-500"}>
              {result.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">
                    {result.success ? "Import réussi!" : "Import échoué"}
                  </p>
                  <div className="text-sm space-y-1">
                    <p>📚 Recettes importées: {result.recipesImported}</p>
                    <p>💰 Coût total: €{result.totalCost.toFixed(2)}</p>
                    <p>⚠️ Erreurs: {result.errors.length}</p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Logs */}
          {logs.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Logs d'exécution:</h3>
              <div className="bg-muted rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs">
                {logs.map((log, idx) => (
                  <div key={idx} className="text-muted-foreground">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <Alert>
            <AlertDescription>
              <div className="space-y-2 text-sm">
                <p className="font-semibold">ℹ️ Informations importantes:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Le processus prend environ 5-10 minutes</li>
                  <li>Coût estimé: ~50€ pour 50 recettes</li>
                  <li>Toutes les recettes sont validées pour la sécurité alimentaire</li>
                  <li>Les traductions utilisent un cache de 90 jours</li>
                  <li>Performance de recherche garantie &lt;100ms</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}