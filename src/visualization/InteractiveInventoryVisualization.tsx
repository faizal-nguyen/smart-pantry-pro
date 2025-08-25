/**
 * Interactive Inventory Visualization Component (Placeholder)
 * This is a simplified placeholder until the full 3D system is ready
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Box, Eye, Palette, Target, Play } from 'lucide-react';
import { motion } from 'framer-motion';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expirationDate: Date;
  freshness: number;
  nutritionalValue: {
    vitamins: number;
    minerals: number;
    fiber?: number;
  };
  location: {
    zone: string;
    x: number;
    y: number;
    z: number;
  };
  discoveryDate: Date;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

interface InteractiveInventoryVisualizationProps {
  inventoryData: InventoryItem[];
  userId: string;
  className?: string;
}

export const InteractiveInventoryVisualization: React.FC<InteractiveInventoryVisualizationProps> = ({
  inventoryData,
  userId,
  className = ''
}) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedView, setSelectedView] = React.useState<'3d' | 'collection' | 'progress'>('3d');

  React.useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full bg-gradient-to-br from-blue-100 to-green-100 rounded-lg ${className}`}>
        <div className="text-center space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"
          />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Initialisation 3D</h3>
            <p className="text-sm text-gray-600">Chargement de l'environnement immersif...</p>
          </div>
        </div>
      </div>
    );
  }

  const rarityCount = {
    common: inventoryData.filter(item => item.rarity === 'common').length,
    uncommon: inventoryData.filter(item => item.rarity === 'uncommon').length,
    rare: inventoryData.filter(item => item.rarity === 'rare').length,
    legendary: inventoryData.filter(item => item.rarity === 'legendary').length,
  };

  const avgFreshness = Math.round(
    inventoryData.reduce((sum, item) => sum + item.freshness, 0) / inventoryData.length * 100
  ) || 0;

  return (
    <div className={`h-full bg-gradient-to-br from-blue-50 to-green-50 rounded-lg overflow-hidden ${className}`}>
      {/* Header Controls */}
      <div className="bg-white/80 backdrop-blur-sm border-b p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Box className="w-5 h-5 text-blue-600" />
            Visualisation 3D Interactive
          </h3>
          <div className="flex gap-2">
            <Button
              variant={selectedView === '3d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedView('3d')}
            >
              <Eye className="w-4 h-4 mr-1" />
              3D
            </Button>
            <Button
              variant={selectedView === 'collection' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedView('collection')}
            >
              <Target className="w-4 h-4 mr-1" />
              Collection
            </Button>
            <Button
              variant={selectedView === 'progress' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedView('progress')}
            >
              <Palette className="w-4 h-4 mr-1" />
              Thèmes
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 h-full">
        {selectedView === '3d' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* 3D Visualization Preview */}
            <Card className="bg-white/70 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <motion.div
                  animate={{ 
                    rotateY: 360,
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    rotateY: { duration: 8, repeat: Infinity, ease: "linear" },
                    scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                  }}
                  className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg shadow-lg flex items-center justify-center"
                >
                  <Box className="w-12 h-12 text-white" />
                </motion.div>
                
                <h4 className="text-xl font-bold text-gray-900 mb-2">
                  Environnement 3D Animal Crossing
                </h4>
                <p className="text-gray-600 mb-4">
                  Explorez votre garde-manger en 3D avec des interactions immersives
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{inventoryData.length}</div>
                    <div className="text-sm text-gray-600">Objets 3D</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{avgFreshness}%</div>
                    <div className="text-sm text-gray-600">Fraîcheur</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">4</div>
                    <div className="text-sm text-gray-600">Zones</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">60</div>
                    <div className="text-sm text-gray-600">FPS</div>
                  </div>
                </div>

                <Button className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700">
                  <Play className="w-4 h-4 mr-2" />
                  Lancer l'Expérience 3D
                </Button>
              </CardContent>
            </Card>

            {/* Navigation Instructions */}
            <Card className="bg-white/50">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-700">
                  Navigation 3D
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 space-y-1">
                <div>• <strong>Clic gauche + glisser:</strong> Rotation de la caméra</div>
                <div>• <strong>Molette:</strong> Zoom avant/arrière</div>
                <div>• <strong>Clic droit + glisser:</strong> Déplacement</div>
                <div>• <strong>Double-clic:</strong> Focus sur un objet</div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {selectedView === 'collection' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  Système de Collection Pokémon
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {Object.entries(rarityCount).map(([rarity, count]) => {
                    const colors = {
                      common: 'bg-gray-100 text-gray-800 border-gray-300',
                      uncommon: 'bg-green-100 text-green-800 border-green-300',
                      rare: 'bg-blue-100 text-blue-800 border-blue-300',
                      legendary: 'bg-purple-100 text-purple-800 border-purple-300'
                    };
                    
                    return (
                      <div key={rarity} className="text-center">
                        <Badge className={`${colors[rarity as keyof typeof colors]} text-lg font-bold px-3 py-2`}>
                          {count}
                        </Badge>
                        <div className="text-sm text-gray-600 mt-1 capitalize font-medium">
                          {rarity}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Progression de découverte</span>
                    <Badge variant="secondary">{inventoryData.length}/100</Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <motion.div 
                      className="bg-gradient-to-r from-blue-600 to-green-600 h-3 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((inventoryData.length / 100) * 100, 100)}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 text-center">
                    Collectez tous les ingrédients pour débloquer des achievements !
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {selectedView === 'progress' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-green-600" />
                  Thèmes Saisonniers Dynamiques
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {[
                    { season: 'Printemps', icon: '🌸', active: false, color: 'from-green-400 to-pink-400' },
                    { season: 'Été', icon: '☀️', active: true, color: 'from-yellow-400 to-orange-400' },
                    { season: 'Automne', icon: '🍂', active: false, color: 'from-orange-400 to-red-400' },
                    { season: 'Hiver', icon: '❄️', active: false, color: 'from-blue-400 to-cyan-400' }
                  ].map(({ season, icon, active, color }) => (
                    <motion.div
                      key={season}
                      whileHover={{ scale: 1.05 }}
                      className={`
                        p-4 rounded-lg border-2 cursor-pointer transition-all duration-300
                        ${active 
                          ? 'border-green-400 bg-green-50 shadow-lg' 
                          : 'border-gray-200 bg-white hover:border-gray-300'
                        }
                      `}
                    >
                      <div className="text-center">
                        <div className={`w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-2xl`}>
                          {icon}
                        </div>
                        <div className={`font-medium ${active ? 'text-green-800' : 'text-gray-700'}`}>
                          {season}
                        </div>
                        {active && (
                          <Badge className="mt-1 bg-green-100 text-green-800">Actif</Badge>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="text-sm text-gray-600 space-y-2">
                  <div>• <strong>Éclairage dynamique</strong> adapté à la saison</div>
                  <div>• <strong>Effets de particules</strong> (neige, pétales, feuilles)</div>
                  <div>• <strong>Couleurs d'ambiance</strong> qui évoluent</div>
                  <div>• <strong>Sons d'ambiance</strong> saisonniers</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default InteractiveInventoryVisualization;