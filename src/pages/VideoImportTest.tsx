import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Video, 
  Loader2, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  Terminal,
  Bug,
  Sparkles
} from "lucide-react";
import { FastVideoImport } from "@/components/video/FastVideoImport";
import { useFastVideoRecipe } from "@/hooks/useFastVideoRecipe";
import { useToast } from "@/hooks/use-toast";

interface LogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

const VideoImportTest = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [testUrl, setTestUrl] = useState("https://www.instagram.com/reel/DK909L4ofTr/?utm_source=ig_web_copy_link");
  const [showComponent, setShowComponent] = useState(true);
  const { toast } = useToast();
  
  // Hook direct pour les tests
  const { state, parseVideo, reset } = useFastVideoRecipe({
    onProgress: (progress, status) => {
      addLog('info', `Progress: ${progress}% - Status: ${status}`);
    },
    onSuccess: (recipe) => {
      addLog('success', `Recipe extracted: ${recipe.title}`);
      toast({
        title: "✅ Succès!",
        description: `Recette "${recipe.title}" extraite avec succès`
      });
    },
    onError: (error) => {
      addLog('error', `Error: ${error}`);
      toast({
        variant: "destructive",
        title: "❌ Erreur",
        description: error
      });
    }
  });

  const addLog = (level: LogEntry['level'], message: string, details?: any) => {
    const entry: LogEntry = {
      timestamp: new Date().toLocaleTimeString('fr-FR'),
      level,
      message,
      details
    };
    setLogs(prev => [...prev, entry]);
    console.log(`[VideoImportTest] ${message}`, details);
  };

  useEffect(() => {
    addLog('info', '🚀 Page de test chargée');
    
    // Vérifier les variables d'environnement
    const envVars = {
      DEEPGRAM_API_KEY: import.meta.env.VITE_DEEPGRAM_API_KEY ? '✅ Présente' : '❌ Manquante',
      CLOUDINARY_CLOUD_NAME: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ? '✅ Présent' : '❌ Manquant',
      OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY ? '✅ Présente' : '❌ Manquante'
    };
    
    addLog('info', 'Variables d\'environnement:', envVars);
  }, []);

  const testDirectAPI = async () => {
    addLog('info', '🧪 Test direct de l\'API...');
    
    try {
      // Use relative URL if on same port, or direct connection if different ports
      const apiUrl = '/api/parse-video-recipe';
      addLog('info', `Calling ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoUrl: testUrl,
          platform: 'instagram'
        })
      });

      addLog('info', `Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        addLog('error', `HTTP Error ${response.status}:`, errorText);
        return;
      }
      
      const data = await response.json();
      addLog('success', 'API Response:', data);
      
      // Afficher les logs détaillés du backend si disponibles
      if (data.debug?.logs) {
        addLog('info', '=== LOGS DÉTAILLÉS DU BACKEND ===');
        data.debug.logs.forEach((log: any) => {
          addLog('info', `[${log.timestamp}] ${log.message}`, log.data);
        });
        addLog('info', '=== FIN LOGS BACKEND ===');
      }
      
    } catch (error: any) {
      addLog('error', 'API Error:', error.message);
    }
  };

  const testHook = async () => {
    addLog('info', '🪝 Test du hook useFastVideoRecipe...');
    await parseVideo(testUrl);
  };

  const copyLogs = () => {
    const logText = logs.map(log => 
      `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message} ${log.details ? JSON.stringify(log.details) : ''}`
    ).join('\n');
    
    navigator.clipboard.writeText(logText);
    toast({
      title: "Logs copiés!",
      description: "Les logs ont été copiés dans le presse-papiers"
    });
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('info', '🧹 Logs effacés');
  };

  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <Terminal className="w-4 h-4 text-blue-500" />;
    }
  };

  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="w-6 h-6" />
              Test Import Vidéo - Debug Interface
              <Badge variant="secondary" className="ml-auto">
                <Sparkles className="w-3 h-3 mr-1" />
                Beta
              </Badge>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Testing Interface */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Interface de Test</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* URL Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">URL de test</label>
                  <div className="flex gap-2">
                    <Input
                      value={testUrl}
                      onChange={(e) => setTestUrl(e.target.value)}
                      placeholder="https://instagram.com/reel/..."
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(testUrl, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Test Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={testDirectAPI} variant="outline">
                    <Terminal className="w-4 h-4 mr-2" />
                    Test API Direct
                  </Button>
                  <Button onClick={testHook} variant="outline">
                    <Video className="w-4 h-4 mr-2" />
                    Test Hook
                  </Button>
                </div>

                {/* Component Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Composant FastVideoImport</span>
                  <Button
                    variant={showComponent ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowComponent(!showComponent)}
                  >
                    {showComponent ? "Masquer" : "Afficher"}
                  </Button>
                </div>

                {/* FastVideoImport Component */}
                {showComponent && (
                  <div className="border rounded-lg p-4">
                    <FastVideoImport
                      onRecipeExtracted={(recipe) => {
                        addLog('success', 'Component: Recipe extracted', recipe);
                      }}
                      onError={(error) => {
                        addLog('error', 'Component: Error', error);
                      }}
                    />
                  </div>
                )}

                {/* Hook State Display */}
                {state.loading && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">
                      Processing... {state.progress}% - {state.status}
                    </span>
                  </div>
                )}

                {state.result && (
                  <div className="p-3 bg-green-50 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="font-medium">Recette extraite!</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Titre: {state.result.title}</p>
                      <p>Ingrédients: {state.result.ingredients?.length || 0}</p>
                      <p>Étapes: {state.result.instructions?.length || 0}</p>
                      <p>Temps: {state.processingTime}ms</p>
                    </div>
                  </div>
                )}

                {state.error && (
                  <div className="p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm">{state.error}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* URLs de test */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">URLs de Test</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setTestUrl("https://www.instagram.com/reel/DK909L4ofTr/")}
                  >
                    Instagram Reel (Recette)
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setTestUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")}
                  >
                    YouTube (Test)
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setTestUrl("https://www.tiktok.com/@test/video/123")}
                  >
                    TikTok (Test)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Logs */}
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Console de Logs</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyLogs}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearLogs}>
                    Effacer
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-2 font-mono text-sm">
                  {logs.map((log, index) => (
                    <div key={index} className="flex items-start gap-2">
                      {getLogIcon(log.level)}
                      <span className="text-gray-500">[{log.timestamp}]</span>
                      <span className={getLogColor(log.level)}>
                        {log.message}
                      </span>
                      {log.details && (
                        <pre className="text-xs text-gray-600 ml-8 mt-1">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <div className="text-gray-400 text-center py-8">
                      Aucun log pour le moment...
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Info Panel */}
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="info">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Informations</TabsTrigger>
                <TabsTrigger value="api">API Endpoints</TabsTrigger>
                <TabsTrigger value="env">Environment</TabsTrigger>
              </TabsList>
              
              <TabsContent value="info" className="space-y-2">
                <h3 className="font-medium mb-2">Comment utiliser cette page</h3>
                <ul className="text-sm space-y-1 list-disc list-inside text-gray-600">
                  <li>Testez l'API directement avec le bouton "Test API Direct"</li>
                  <li>Testez le hook React avec "Test Hook"</li>
                  <li>Utilisez le composant FastVideoImport pour tester l'interface complète</li>
                  <li>Observez les logs en temps réel dans la console</li>
                  <li>Copiez les logs pour les partager ou les analyser</li>
                </ul>
              </TabsContent>
              
              <TabsContent value="api" className="space-y-2">
                <h3 className="font-medium mb-2">Endpoints disponibles</h3>
                <div className="space-y-2 text-sm">
                  <div className="p-2 bg-gray-50 rounded">
                    <code>POST /api/parse-video-recipe</code>
                    <p className="text-xs text-gray-600 mt-1">Parse une vidéo et extrait la recette</p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="env" className="space-y-2">
                <h3 className="font-medium mb-2">Variables d'environnement</h3>
                <div className="space-y-1 text-sm">
                  <div>DEEPGRAM_API_KEY: {import.meta.env.VITE_DEEPGRAM_API_KEY ? '✅' : '❌'}</div>
                  <div>CLOUDINARY_CLOUD_NAME: {import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ? '✅' : '❌'}</div>
                  <div>OPENAI_API_KEY: {import.meta.env.VITE_OPENAI_API_KEY ? '✅' : '❌'}</div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VideoImportTest;