# Guide de Contribution - Smart Pantry Pro

## 👋 Bienvenue !

Merci de votre intérêt pour contribuer à Smart Pantry Pro ! Ce guide vous aidera à comprendre notre processus de développement et les meilleures pratiques pour contribuer efficacement au projet.

## 📋 Table des matières

1. [Code de conduite](#code-de-conduite)
2. [Comment contribuer](#comment-contribuer)
3. [Setup de développement](#setup-de-développement)
4. [Standards de code](#standards-de-code)
5. [Processus de Pull Request](#processus-de-pull-request)
6. [Tests](#tests)
7. [Documentation](#documentation)
8. [Reporting bugs](#reporting-bugs)
9. [Demandes de fonctionnalités](#demandes-de-fonctionnalités)

## 🤝 Code de conduite

En participant à ce projet, vous acceptez de respecter notre code de conduite. Nous attendons de tous les contributeurs qu'ils maintiennent un environnement respectueux et inclusif.

### Nos engagements

- Utiliser un langage accueillant et inclusif
- Respecter les points de vue et expériences diverses
- Accepter gracieusement les critiques constructives
- Se concentrer sur ce qui est le mieux pour la communauté
- Faire preuve d'empathie envers les autres membres

## 🛠 Comment contribuer

### Types de contributions

Nous accueillons plusieurs types de contributions :

- **🐛 Corrections de bugs** : Identifier et corriger des problèmes
- **✨ Nouvelles fonctionnalités** : Ajouter des fonctionnalités utiles
- **📚 Documentation** : Améliorer ou traduire la documentation
- **🧪 Tests** : Ajouter ou améliorer la couverture de tests
- **🎨 UI/UX** : Améliorer l'interface utilisateur
- **⚡ Performance** : Optimiser les performances de l'application
- **🔧 Refactoring** : Améliorer la qualité du code

### Avant de commencer

1. **Recherchez les issues existantes** pour éviter les doublons
2. **Créez ou commentez une issue** pour discuter de votre contribution
3. **Attendez la validation** de l'équipe avant de commencer le développement
4. **Forkez le repository** et créez votre branche

## 🔧 Setup de développement

### Prérequis

- Node.js 18.17+
- npm 9+
- Git 2.34+
- Un éditeur avec support TypeScript (VS Code recommandé)

### Installation

```bash
# Cloner votre fork
git clone https://github.com/your-username/smart-pantry-pro.git
cd smart-pantry-pro

# Installer les dépendances
npm install

# Copier et configurer les variables d'environnement
cp .env.example .env.local
# Éditer .env.local avec vos clés API

# Démarrer l'environnement de développement
npm run dev
```

### Configuration VS Code (recommandée)

Extensions recommandées :
- TypeScript Importer
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint
- Tailwind CSS IntelliSense

Configuration workspace (`.vscode/settings.json`) :
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## 📐 Standards de code

### Conventions générales

#### Nommage
- **Fichiers** : kebab-case (`user-profile.tsx`)
- **Composants** : PascalCase (`UserProfile`)
- **Fonctions/variables** : camelCase (`getUserData`)
- **Constants** : UPPER_SNAKE_CASE (`API_BASE_URL`)

#### Structure des fichiers
```
src/
├── components/
│   ├── ui/           # Composants réutilisables
│   ├── features/     # Composants métier
│   └── layout/       # Composants de layout
├── hooks/            # Custom hooks
├── services/         # Services externes
├── utils/            # Utilitaires
├── types/            # Types TypeScript
└── pages/            # Pages de l'application
```

### TypeScript

#### Types stricts
```typescript
// ✅ Bon
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

// ❌ Éviter
interface User {
  id: any;
  name: string;
  email?: string; // sauf si vraiment optionnel
}
```

#### Props des composants
```typescript
// ✅ Bon
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  onClick: () => void;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant, 
  size = 'md', 
  onClick, 
  children 
}) => {
  // ...
};
```

### React

#### Hooks
```typescript
// ✅ Bon - Hooks personnalisés
export const useShoppingList = (listId: string) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ShoppingList | null>(null);
  
  // Logique métier ici
  
  return { loading, data, addItem, removeItem };
};
```

#### Composants
```tsx
// ✅ Bon - Structure de composant
export const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  onEdit, 
  onDelete 
}) => {
  // Hooks en premier
  const [isEditing, setIsEditing] = useState(false);
  
  // Handlers
  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);
  
  // Early returns
  if (!product) {
    return <ProductCardSkeleton />;
  }
  
  // Render
  return (
    <div className="product-card">
      {/* Contenu */}
    </div>
  );
};
```

### Styling avec Tailwind

#### Classes organisées
```tsx
// ✅ Bon - Classes groupées logiquement
<button 
  className={cn(
    // Layout
    "flex items-center justify-center",
    // Spacing
    "px-4 py-2 gap-2",
    // Appearance
    "bg-blue-500 text-white rounded-lg",
    // States
    "hover:bg-blue-600 focus:ring-2 focus:ring-blue-300",
    // Responsive
    "sm:px-6 sm:py-3"
  )}
>
  Confirmer
</button>
```

#### Composants UI réutilisables
```tsx
// ✅ Bon - Variants avec cva
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

## 🔄 Processus de Pull Request

### 1. Préparation

```bash
# Créer une branche depuis main
git checkout main
git pull origin main
git checkout -b feature/nom-de-la-fonctionnalite

# Ou pour un bugfix
git checkout -b fix/description-du-bug
```

### 2. Développement

- Suivez les standards de code
- Écrivez des tests pour votre code
- Documentez les nouvelles fonctionnalités
- Committez régulièrement avec des messages clairs

### 3. Conventions de commit

Nous utilisons les [Conventional Commits](https://www.conventionalcommits.org/) :

```bash
# Format
<type>[scope optionnel]: <description>

# Exemples
feat(scanner): add barcode fallback APIs
fix(voice): improve French recognition accuracy
docs(api): update authentication endpoints
test(shopping): add real-time sync tests
refactor(components): extract reusable button variants
```

**Types disponibles :**
- `feat`: Nouvelle fonctionnalité
- `fix`: Correction de bug
- `docs`: Documentation
- `style`: Formatage, point-virgules manquants, etc.
- `refactor`: Refactoring du code
- `test`: Ajout ou modification de tests
- `chore`: Maintenance (dépendances, config, etc.)

### 4. Tests et validation

```bash
# Vérifier les tests
npm test

# Vérifier le linting
npm run lint

# Vérifier les types TypeScript
npm run type-check

# Build de production
npm run build
```

### 5. Soumission

```bash
# Pousser votre branche
git push origin feature/nom-de-la-fonctionnalite

# Créer la Pull Request via GitHub
```

### 6. Template de Pull Request

```markdown
## Description
Brief description of what this PR does.

## Type of change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issues
Fixes #123
Closes #456

## Screenshots (if applicable)
[Add screenshots for UI changes]

## Testing
- [ ] Tests pass locally
- [ ] New tests added for new features
- [ ] Manual testing completed

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
```

## 🧪 Tests

### Types de tests

#### Tests unitaires
```typescript
// src/hooks/__tests__/useShoppingList.test.ts
import { renderHook, act } from '@testing-library/react';
import { useShoppingList } from '../useShoppingList';

describe('useShoppingList', () => {
  it('should add item to shopping list', async () => {
    const { result } = renderHook(() => useShoppingList('list-1'));
    
    await act(async () => {
      await result.current.addItem({
        name: 'Milk',
        quantity: 1,
        unit: 'L'
      });
    });
    
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].name).toBe('Milk');
  });
});
```

#### Tests de composants
```typescript
// src/components/__tests__/ProductCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from '../ProductCard';

describe('ProductCard', () => {
  const mockProduct = {
    id: '1',
    name: 'Milk',
    quantity: 2,
    unit: 'L',
    expiryDate: '2024-01-20'
  };

  it('renders product information', () => {
    render(<ProductCard product={mockProduct} />);
    
    expect(screen.getByText('Milk')).toBeInTheDocument();
    expect(screen.getByText('2 L')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    const mockOnEdit = jest.fn();
    render(<ProductCard product={mockProduct} onEdit={mockOnEdit} />);
    
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(mockOnEdit).toHaveBeenCalledWith(mockProduct);
  });
});
```

### Commandes de test

```bash
# Tous les tests
npm test

# Tests en mode watch
npm run test:watch

# Coverage
npm run test:coverage

# Tests spécifiques
npm test -- --testNamePattern="useShoppingList"
```

## 📚 Documentation

### JSDoc pour les fonctions publiques

```typescript
/**
 * Adds a product to the user's pantry inventory
 * @param pantryId - The unique identifier of the pantry
 * @param product - The product to add
 * @param options - Additional options for the operation
 * @returns Promise resolving to the created product with ID
 */
export async function addProductToPantry(
  pantryId: string,
  product: Omit<Product, 'id'>,
  options: AddProductOptions = {}
): Promise<Product> {
  // Implementation
}
```

### README pour les modules complexes

```markdown
# Enhanced Voice Recognition Service

This service provides French-specific voice recognition capabilities for the Smart Pantry Pro application.

## Features

- French culinary vocabulary recognition
- Fallback to text input
- Action parsing and validation
- Context-aware suggestions

## Usage

```typescript
import { useEnhancedVoice } from '@/hooks/useEnhancedVoice';

const { startListening, transcript, isListening } = useEnhancedVoice({
  language: 'fr-FR',
  onResult: (action) => {
    // Handle parsed voice action
  }
});
```

## Architecture

[Explain the architecture decisions and patterns used]
```

## 🐛 Reporting bugs

### Avant de reporter un bug

1. **Vérifiez les issues existantes** pour éviter les doublons
2. **Reproduisez le bug** de manière consistante
3. **Testez sur différents navigateurs** si applicable
4. **Rassemblez les informations** nécessaires

### Template de bug report

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. iOS]
 - Browser [e.g. chrome, safari]
 - Version [e.g. 22]
 - Device: [e.g. iPhone6]

**Additional context**
Add any other context about the problem here.
```

## 💡 Demandes de fonctionnalités

### Template de feature request

```markdown
**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is. Ex. I'm always frustrated when [...]

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.

**Implementation considerations**
- Technical complexity
- Impact on existing features
- Required resources
```

## 🏷 Labels et priorités

### Labels d'issue

- `bug` - Quelque chose ne fonctionne pas
- `enhancement` - Nouvelle fonctionnalité ou demande
- `documentation` - Améliorations ou ajouts à la documentation
- `good first issue` - Bon pour les nouveaux contributeurs
- `help wanted` - Aide supplémentaire souhaitée
- `question` - Question ou discussion

### Priorités

- `priority: high` - Critique, doit être résolu rapidement
- `priority: medium` - Important, à résoudre dans le prochain cycle
- `priority: low` - Amélioration, peut attendre

## 🎉 Reconnaissance

Nous reconnaissons toutes les contributions, qu'elles soient grandes ou petites. Les contributeurs sont automatiquement ajoutés à notre [liste de contributeurs](../CONTRIBUTORS.md).

## 📞 Contact

Si vous avez des questions ou besoin d'aide :

- 💬 **GitHub Discussions** : Pour les questions générales
- 📧 **Email** : dev@smartpantrypro.com
- 💼 **LinkedIn** : [@smartpantrypro](https://linkedin.com/company/smartpantrypro)

## 📄 Licence

En contribuant à Smart Pantry Pro, vous acceptez que vos contributions soient sous licence MIT.

---

**Merci de contribuer à Smart Pantry Pro ! 🙏**

Votre aide fait la différence pour créer une meilleure expérience culinaire pour tous nos utilisateurs.