# Configuration de la clé OpenAI sur Vercel

## Étapes pour configurer OPENAI_API_KEY

### 1. Accéder aux paramètres du projet Vercel
1. Connectez-vous à [vercel.com](https://vercel.com)
2. Sélectionnez votre projet `smart-pantry-pro`
3. Cliquez sur l'onglet "Settings"

### 2. Ajouter la variable d'environnement
1. Dans le menu de gauche, cliquez sur "Environment Variables"
2. Cliquez sur "Add New"
3. Remplissez les champs :
   - **Key**: `OPENAI_API_KEY`
   - **Value**: Votre clé API OpenAI (commence par `sk-`)
   - **Environment**: Sélectionnez "Production", "Preview", et "Development"
4. Cliquez sur "Save"

### 3. Redéployer l'application
1. Allez dans l'onglet "Deployments"
2. Cliquez sur les trois points (...) à côté du dernier déploiement
3. Sélectionnez "Redeploy"
4. Confirmez le redéploiement

### 4. Vérifier le fonctionnement
Après le redéploiement, testez les fonctionnalités suivantes :
- Parsing d'URL de recette (Marmiton, 750g, etc.)
- Parsing de recettes depuis les réseaux sociaux
- Parsing avec IA (fallback)

## APIs qui nécessitent OPENAI_API_KEY

Les endpoints suivants nécessitent la clé OpenAI pour fonctionner :
- `/api/parse-recipe-ai` - Parsing de recettes avec IA
- `/api/parse-social-ai` - Parsing de réseaux sociaux avec IA
- `/api/voice-recipe` - Reconnaissance vocale de recettes

## Obtenir une clé OpenAI

Si vous n'avez pas encore de clé OpenAI :
1. Créez un compte sur [platform.openai.com](https://platform.openai.com)
2. Allez dans "API Keys"
3. Cliquez sur "Create new secret key"
4. Copiez la clé (elle ne sera plus visible après)

## Sécurité

⚠️ **Important** : 
- Ne jamais commiter la clé API dans le code
- Ne jamais partager la clé API publiquement
- Utiliser toujours les variables d'environnement Vercel
- Régénérer la clé si elle est compromise

## Dépannage

Si les APIs retournent toujours des erreurs 500 après configuration :
1. Vérifiez que la clé est correctement copiée (sans espaces)
2. Vérifiez que la clé n'est pas expirée ou révoquée
3. Consultez les logs Vercel pour plus de détails
4. Assurez-vous d'avoir du crédit sur votre compte OpenAI