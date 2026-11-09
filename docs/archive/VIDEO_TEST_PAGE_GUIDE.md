# 🧪 Page de Test - Import Vidéo

## 🚀 Comment utiliser

### 1. **Accéder à la page**
Allez sur : **http://localhost:3000/video-test**

### 2. **Interface de test**
La page contient plusieurs outils :

#### **🎯 Tests disponibles**
1. **Test API Direct** - Teste l'endpoint `/api/parse-video-recipe` 
2. **Test Hook** - Teste le hook React `useFastVideoRecipe`
3. **Composant FastVideoImport** - Interface utilisateur complète

#### **📝 Console de Logs**
- Affiche tous les logs en temps réel
- Bouton **Copier** pour exporter les logs
- Bouton **Effacer** pour vider la console

#### **🔗 URLs de test**
- **Instagram Reel** (par défaut) : `https://www.instagram.com/reel/DK909L4ofTr/`
- **YouTube** : URL de test
- **TikTok** : URL de test

### 3. **Workflow de test**

#### **Test rapide**
1. Cliquer sur **"Test API Direct"**
2. Observer les logs dans la console de droite
3. Vérifier si l'API répond (status 200/500)

#### **Test complet**
1. Afficher le **composant FastVideoImport**
2. Coller une URL vidéo
3. Cliquer **"Parser la vidéo"**
4. Observer la progression et les logs

### 4. **Ce que vous verrez**

#### **✅ Si ça marche**
```
[14:30:25] INFO: 🚀 Page de test chargée
[14:30:26] INFO: Variables d'environnement: {...}
[14:30:30] INFO: 🧪 Test direct de l'API...
[14:30:32] INFO: Response status: 200
[14:30:32] SUCCESS: API Response: {...}
```

#### **❌ Si ça ne marche pas**
```
[14:30:25] ERROR: API Error: fetch failed
[14:30:25] ERROR: Error: Failed to parse video
```

### 5. **Vérifications automatiques**

La page vérifie automatiquement :
- ✅ Variables d'environnement présentes
- ✅ Serveur API accessible
- ✅ Composants React fonctionnels

### 6. **Debug avec la console**

#### **Logs détaillés disponibles**
- Hook lifecycle : init, progress, success/error
- API calls : request/response
- Component state : loading, data, errors

#### **Export des logs**
Cliquez **"Copier"** pour exporter tous les logs et les partager.

## 🔧 Dépannage

### **Erreur 404 sur l'API**
- Vérifiez que le serveur API est lancé : `npm run api`
- URL doit être `http://localhost:3001/api/parse-video-recipe`

### **Erreur 500**
- Vérifiez les logs du serveur API dans le terminal
- Problème probable : TypeScript imports

### **Page ne charge pas**
- Vérifiez que le frontend est lancé : `npm run dev`
- URL doit être `http://localhost:3000/video-test`

### **Pas de logs**
- Ouvrir la console développeur (F12)
- Vérifier s'il y a des erreurs JavaScript

## 📊 Exemple de session de test

```
1. [14:30:25] INFO: 🚀 Page de test chargée
2. [14:30:26] INFO: Variables d'environnement: {...}
3. [Clic sur "Test API Direct"]
4. [14:30:30] INFO: 🧪 Test direct de l'API...
5. [14:30:32] INFO: Response status: 200
6. [14:30:32] SUCCESS: API Response: {
     success: true,
     data: { title: "Test Recipe", ... },
     processingTime: "2003ms"
   }
7. [Clic sur "Test Hook"]
8. [14:30:35] INFO: 🪝 Test du hook useFastVideoRecipe...
9. [14:30:36] INFO: Progress: 5% - Status: extracting
10. [14:30:38] SUCCESS: Recipe extracted: Test Recipe
```

## 🎯 Objectif

Cette page permet de :
- ✅ **Vérifier** que l'API fonctionne
- ✅ **Déboguer** les problèmes en temps réel  
- ✅ **Tester** les différents composants
- ✅ **Exporter** les logs pour analyse

C'est votre outil principal pour déboguer l'import vidéo ! 🚀