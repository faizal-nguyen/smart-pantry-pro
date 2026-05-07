'use client';

import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { AIAssistantChat, AIAssistantErrorBoundary } from '@/components/ai';
import { PageLoader } from '@/components/layout/PageLoader';
import { MaterialButton } from '@/components/ui/material/Button';
import { MaterialCard, MaterialCardContent } from '@/components/ui/material/Card';
import { MessageSquare, X, ChefHat, ShoppingCart, Calendar, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AppNavigation from '@/components/navigation/AppNavigation';

export default function AssistantAI() {
  const [showChat, setShowChat] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };
    getUser();
  }, []);

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <AppNavigation user={user}>
      <div className="container mx-auto p-4">
        <div className="max-w-6xl mx-auto">
          <header className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <ChefHat className="h-10 w-10 text-primary" />
              Assistant Culinaire IA
            </h1>
            <p className="text-xl text-muted-foreground">
              Votre expert culinaire personnel pour une gestion intelligente de votre garde-manger
            </p>
          </header>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <FeatureCard
              icon={<ShoppingCart className="h-8 w-8" />}
              title="Gestion intelligente"
              description="Optimisez vos achats et réduisez le gaspillage alimentaire avec des suggestions personnalisées."
            />
            <FeatureCard
              icon={<Calendar className="h-8 w-8" />}
              title="Planification de repas"
              description="Planifiez vos repas de la semaine en fonction de votre inventaire et de vos préférences."
            />
            <FeatureCard
              icon={<ChefHat className="h-8 w-8" />}
              title="Recettes adaptées"
              description="Découvrez des recettes délicieuses adaptées à vos ingrédients disponibles."
            />
            <FeatureCard
              icon={<Lightbulb className="h-8 w-8" />}
              title="Conseils anti-gaspi"
              description="Recevez des astuces pour utiliser vos produits avant qu'ils ne périment."
            />
          </div>

          {/* Demo Commands */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 text-center">
              Commencez avec ces exemples
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <CommandSection
                title="🍳 Recettes rapides"
                commands={[
                  "Qu'est-ce que je peux cuisiner avec du poulet et des brocolis ?",
                  "Donne-moi une recette végétarienne pour 4 personnes",
                  "J'ai faim, propose-moi quelque chose de rapide"
                ]}
                gradient="from-orange-500 to-red-500"
              />
              
              <CommandSection
                title="📦 Inventaire"
                commands={[
                  "Qu'est-ce qui expire bientôt dans mon frigo ?",
                  "Ajoute 2 kg de tomates à mon inventaire",
                  "Combien me reste-t-il de lait ?"
                ]}
                gradient="from-blue-500 to-cyan-500"
              />
              
              <CommandSection
                title="📝 Planification"
                commands={[
                  "Aide-moi à planifier mes repas pour la semaine",
                  "Crée une liste de courses pour mes recettes",
                  "Propose un menu équilibré pour demain"
                ]}
                gradient="from-green-500 to-emerald-500"
              />
              
              <CommandSection
                title="💡 Anti-gaspillage"
                commands={[
                  "Que faire avec des bananes trop mûres ?",
                  "J'ai des restes de riz, des idées ?",
                  "Comment conserver mes légumes plus longtemps ?"
                ]}
                gradient="from-purple-500 to-pink-500"
              />
            </div>
          </section>

          {/* CTA Button */}
          <div className="text-center">
            <MaterialButton
              onClick={() => setShowChat(true)}
              size="lg"
              variant="filled"
              icon={<MessageSquare className="h-5 w-5" />}
            >
              Démarrer une conversation
            </MaterialButton>
          </div>
        </div>

        {/* Floating Chat Interface */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed inset-4 md:inset-auto md:bottom-6 md:right-6 z-50 md:w-[450px] md:h-[600px] flex flex-col"
            >
              <AIAssistantErrorBoundary>
                <AIAssistantChat
                  defaultMode="expanded"
                  onClose={() => setShowChat(false)}
                  className="h-full shadow-2xl"
                />
              </AIAssistantErrorBoundary>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppNavigation>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <MaterialCard variant="elevated" interactive className="transition-all duration-200">
      <MaterialCardContent className="p-6">
        <div className="text-primary mb-4">{icon}</div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </MaterialCardContent>
    </MaterialCard>
  );
}

interface CommandSectionProps {
  title: string;
  commands: string[];
  gradient: string;
}

function CommandSection({ title, commands, gradient }: CommandSectionProps) {
  return (
    <MaterialCard variant="outlined" className="relative overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradient}`} />
      <MaterialCardContent className="p-6">
        <h3 className="font-semibold mb-4">{title}</h3>
        <ul className="space-y-3">
          {commands.map((command, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-muted-foreground mt-0.5">•</span>
              <span className="text-sm italic">"{command}"</span>
            </li>
          ))}
        </ul>
      </MaterialCardContent>
    </MaterialCard>
  );
}