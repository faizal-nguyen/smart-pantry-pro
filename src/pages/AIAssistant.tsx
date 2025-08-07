import React, { useState } from 'react';
import { AIAssistantChat, AIAssistantErrorBoundary } from '@/components/ai';
import { Button } from '@/components/ui/button';
import { MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIAssistantPage() {
  const [showChat, setShowChat] = useState(false);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Assistant Culinaire IA</h1>
      
      <div className="prose prose-lg max-w-none mb-8">
        <p>
          Découvrez notre assistant culinaire intelligent qui vous aide à:
        </p>
        <ul>
          <li>Trouver des recettes adaptées à votre inventaire</li>
          <li>Éviter le gaspillage alimentaire</li>
          <li>Planifier vos repas de la semaine</li>
          <li>Créer des listes de courses intelligentes</li>
          <li>Répondre à vos questions culinaires</li>
        </ul>
      </div>

      {/* Floating Chat Button */}
      <AnimatePresence>
        {!showChat && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="fixed bottom-6 right-6 z-40"
          >
            <Button
              onClick={() => setShowChat(true)}
              size="lg"
              className="rounded-full h-14 w-14 shadow-lg"
            >
              <MessageSquare className="h-6 w-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Interface */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-6 right-6 z-50 w-full max-w-lg"
          >
            <AIAssistantErrorBoundary>
              <AIAssistantChat
                defaultMode="expanded"
                onClose={() => setShowChat(false)}
              />
            </AIAssistantErrorBoundary>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Demo Section */}
      <div className="mt-12 space-y-6">
        <h2 className="text-2xl font-semibold">Essayez ces commandes:</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DemoCard
            title="🍳 Recettes rapides"
            examples={[
              "Qu'est-ce que je peux cuisiner en 20 minutes ?",
              "Donne-moi une recette avec du poulet et des légumes",
              "Je veux une recette végétarienne simple"
            ]}
          />
          
          <DemoCard
            title="📦 Gestion d'inventaire"
            examples={[
              "Quels produits expirent bientôt ?",
              "Ajoute 2 litres de lait à mon inventaire",
              "Qu'est-ce qui me manque pour faire une quiche ?"
            ]}
          />
          
          <DemoCard
            title="📝 Planification"
            examples={[
              "Aide-moi à planifier les repas de la semaine",
              "Crée une liste de courses pour 4 personnes",
              "Propose un menu équilibré pour demain"
            ]}
          />
          
          <DemoCard
            title="💡 Conseils anti-gaspi"
            examples={[
              "Comment utiliser mes restes de riz ?",
              "Que faire avec des bananes trop mûres ?",
              "Idées pour utiliser mes légumes qui flétrissent"
            ]}
          />
        </div>
      </div>
    </div>
  );
}

interface DemoCardProps {
  title: string;
  examples: string[];
}

function DemoCard({ title, examples }: DemoCardProps) {
  return (
    <div className="bg-card rounded-lg p-6 border">
      <h3 className="font-semibold mb-3">{title}</h3>
      <ul className="space-y-2">
        {examples.map((example, index) => (
          <li key={index} className="text-sm text-muted-foreground">
            • "{example}"
          </li>
        ))}
      </ul>
    </div>
  );
}