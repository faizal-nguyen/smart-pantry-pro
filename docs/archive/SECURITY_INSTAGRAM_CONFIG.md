# 🔒 Configuration Sécurisée Instagram oEmbed

## ⚠️ Actions Urgentes

1. **Va immédiatement sur developers.facebook.com**
2. **My Apps → Ton app → Settings → Basic**
3. **Clique "Reset" à côté de "App Secret"**
4. **Génère une nouvelle clé secrète**

## 🛡️ Règles de Sécurité Absolues

```
JAMAIS partager publiquement :
❌ App Secret
❌ Access Tokens
❌ API Keys
✅ App ID seul est OK (mais évite quand même)
```

## 📋 Configuration Étape par Étape

### 1. Créer/Configurer l'App Facebook

1. Va sur [developers.facebook.com](https://developers.facebook.com)
2. Créé une nouvelle app ou sélectionne une existante
3. Dans "Add Product" → Ajoute "oEmbed"
4. Configure les permissions Instagram Basic Display

### 2. Obtenir les Credentials

```bash
# Dans Facebook Developer Dashboard:
# Settings → Basic
APP_ID: [Copie ton App ID]
APP_SECRET: [Copie ton nouveau App Secret après reset]
```

### 3. Configurer .env.local

```bash
# .env.local (JAMAIS commité)
FACEBOOK_APP_ID=ton_app_id_ici
FACEBOOK_APP_SECRET=ton_nouveau_secret_ici
```

### 4. Vérifier .gitignore

```bash
# Assure-toi que ces lignes sont présentes:
.env.local
.env
*.env
```

## 🧪 Test de Configuration

```bash
# Test local (remplace avec TES credentials)
curl -X GET "https://graph.facebook.com/v18.0/instagram_oembed?url=https://www.instagram.com/p/C_E5JF_Ihpl/&access_token=TON_APP_ID|TON_APP_SECRET"
```

## 🚀 Déploiement Production

### Vercel
1. Dashboard → Settings → Environment Variables
2. Ajoute FACEBOOK_APP_ID et FACEBOOK_APP_SECRET
3. Redéploie l'application

### Autres Plateformes
- Utilise les secrets/environment variables de ta plateforme
- Ne JAMAIS hardcoder les credentials dans le code

## 📊 Monitoring

1. Facebook Developer Dashboard → App Review
2. Vérifie régulièrement l'usage et les limites
3. Active les alertes de sécurité

## 🔄 Rotation des Clés

- Rotate l'App Secret tous les 3-6 mois
- En cas de compromission: Reset immédiatement
- Update tous les environnements après rotation

## ✅ Checklist de Sécurité

- [ ] App Secret reseté sur Facebook
- [ ] Nouvelles credentials dans .env.local
- [ ] .gitignore vérifié
- [ ] Aucun credential hardcodé dans le code
- [ ] Variables d'environnement configurées en production
- [ ] Test de l'intégration effectué

## 🆘 En Cas de Fuite

1. Reset immédiatement l'App Secret
2. Vérifie les logs d'accès dans Facebook Dashboard
3. Update tous les environnements
4. Revois les accès et permissions