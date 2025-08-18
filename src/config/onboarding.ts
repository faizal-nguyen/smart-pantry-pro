import { OnboardingStepData, TutorialHighlight } from '@/types/onboarding';

export const ONBOARDING_STEPS: OnboardingStepData[] = [
  {
    id: 'welcome',
    type: 'splash',
    index: 0,
    content: {
      title: "Bienvenue dans votre cuisine intelligente",
      subtitle: "Réduisons le gaspillage ensemble",
      animation: 'lottie-kitchen',
      icon: '🍳'
    }
  },
  {
    id: 'household-setup',
    type: 'interactive',
    index: 1,
    question: "Combien êtes-vous à la maison ?",
    options: ['Solo', '2 personnes', '3-4', '5+'],
    followUp: {
      'Solo': null,
      '2 personnes': "Partagez-vous les courses ?",
      '3-4': "Y a-t-il des enfants ?",
      '5+': "Configuration famille nombreuse"
    },
    illustration: '👥'
  },
  {
    id: 'dietary-preferences',
    type: 'multi-select',
    index: 2,
    question: "Des préférences alimentaires ?",
    options: [
      { id: 'vegetarian', icon: '🥬', label: 'Végétarien' },
      { id: 'vegan', icon: '🌱', label: 'Vegan' },
      { id: 'gluten-free', icon: '🌾', label: 'Sans gluten' },
      { id: 'lactose-free', icon: '🥛', label: 'Sans lactose' },
      { id: 'halal', icon: '☪️', label: 'Halal' },
      { id: 'kosher', icon: '✡️', label: 'Casher' }
    ]
  },
  {
    id: 'cooking-level',
    type: 'slider',
    index: 3,
    question: "Quel est votre niveau en cuisine ?",
    range: {
      min: { label: 'Débutant', emoji: '🍳' },
      mid: { label: 'Intermédiaire', emoji: '👨‍🍳' },
      max: { label: 'Expert', emoji: '👨‍🍳✨' }
    }
  },
  {
    id: 'goals',
    type: 'priority-ranking',
    index: 4,
    question: "Qu'est-ce qui compte le plus pour vous ?",
    items: [
      'Réduire le gaspillage',
      'Économiser de l\'argent',
      'Manger plus sainement',
      'Gagner du temps',
      'Découvrir de nouvelles recettes'
    ]
  },
  {
    id: 'initial-inventory',
    type: 'quick-scan',
    index: 5,
    title: "Commençons par votre frigo",
    subtitle: "Prenez une photo ou scannez quelques produits",
    skipable: true
  }
];

export const TUTORIAL_HIGHLIGHTS: TutorialHighlight[] = [
  {
    element: 'add-product-button',
    message: "Ajoutez vos produits ici",
    gesture: 'tap',
    position: 'bottom'
  },
  {
    element: 'expiry-badge',
    message: "Les badges colorés indiquent la fraîcheur",
    gesture: 'point',
    position: 'top'
  },
  {
    element: 'ai-assistant',
    message: "Votre chef personnel est toujours là",
    gesture: 'pulse',
    position: 'left'
  },
  {
    element: 'shopping-list',
    message: "Organisez vos courses intelligemment",
    gesture: 'tap',
    position: 'bottom'
  },
  {
    element: 'recipe-suggestions',
    message: "Découvrez des recettes avec vos ingrédients",
    gesture: 'swipe',
    position: 'center'
  }
];

export const ONBOARDING_STORAGE_KEY = 'smart-pantry-onboarding';
export const PERSONALIZATION_STORAGE_KEY = 'smart-pantry-personalization';
export const TUTORIAL_STORAGE_KEY = 'smart-pantry-tutorial';