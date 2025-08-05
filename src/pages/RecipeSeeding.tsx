import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RecipeSeedingOrchestrator } from "@/services/recipe-seeding/seeding-orchestrator";
import { Loader2 } from "lucide-react";

const RecipeSeeding = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const startSeeding = async () => {
    setIsRunning(true);
    setResult(null);
    setLogs([]);
    addLog("🚀 Démarrage du seeding des recettes...");

    try {
      const orchestrator = new RecipeSeedingOrchestrator();
      
      orchestrator.onProgress((progress) => {
        addLog(`${progress.phase}: ${progress.current}/${progress.total} - ${progress.message}`);
      });

      const seedingResult = await orchestrator.seedRecipes();
      setResult(seedingResult);
      
      if (seedingResult.success) {
        addLog(`✅ Succès! ${seedingResult.recipesImported} recettes importées.`);
        addLog(`💰 Coût total: €${seedingResult.totalCost.toFixed(2)}`);
      } else {
        addLog(`❌ Échec du seeding.`);
      }
      
    } catch (error: any) {
      addLog(`❌ Erreur: ${error.message}`);
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

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>🥘 Recipe Database Seeding - Phase 1</CardTitle>
          <CardDescription>
            Import de 50 recettes indiennes depuis Kannamma Cooks avec traduction française
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">📋 Avant de commencer:</h3>
            <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
              <li>Assurez-vous que la migration SQL a été appliquée</li>
              <li>Vérifiez que OPENAI_API_KEY est configuré</li>
              <li>Processus prend ~5-10 minutes</li>
              <li>Coût estimé: ~50€ pour 50 recettes</li>
            </ul>
          </div>

          <Button
            size="lg"
            onClick={startSeeding}
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Seeding en cours...
              </>
            ) : (
              "🚀 Démarrer le seeding (50 recettes)"
            )}
          </Button>

          {result && (
            <div className={`p-4 rounded-lg ${result.success ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'}`}>
              <p className="font-semibold mb-2">
                {result.success ? "✅ Import réussi!" : "❌ Import échoué"}
              </p>
              <div className="text-sm space-y-1">
                <p>📚 Recettes importées: {result.recipesImported}</p>
                <p>💰 Coût total: €{result.totalCost.toFixed(2)}</p>
                <p>⚠️ Erreurs: {result.errors.length}</p>
                {result.errors.length > 0 && (
                  <div className="mt-2 text-xs text-red-700">
                    {result.errors.map((err: string, idx: number) => (
                      <div key={idx}>• {err}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {logs.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">📝 Logs d'exécution:</h3>
              <div className="bg-gray-900 text-gray-100 rounded-lg p-4 h-64 overflow-y-auto">
                <div className="font-mono text-xs space-y-1">
                  {logs.map((log, idx) => (
                    <div key={idx} className="hover:bg-gray-800 px-1 rounded">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RecipeSeeding;