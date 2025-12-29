# Lancer Smart Pantry Pro (UI + API)

Ce guide explique comment démarrer l'interface (Vite sur port 3002) et l'API locale (port 3003) avec une seule commande.

## Prérequis
- Node.js et npm installés
- Dépendances déjà installées dans `smart-pantry-pro` (exécutez `npm install` si nécessaire)

## Commande à exécuter

1) Rendre le script exécutable (à faire une seule fois):
```bash
chmod +x "/Users/faizel/Documents/Mes documents/3_Dev/Projets/Smart Grocery/smart-pantry-pro/.claude/commands/start-smart-pantry.sh"
```

2) Lancer l'environnement de développement (UI + API):
```bash
"/Users/faizel/Documents/Mes documents/3_Dev/Projets/Smart Grocery/smart-pantry-pro/.claude/commands/start-smart-pantry.sh"
```

- UI (Vite): `http://localhost:3002`
- API locale: `http://localhost:3003`

Le script libère automatiquement les ports 3002/3003 s'ils sont déjà utilisés, puis exécute `npm run dev` (qui démarre Vite et le serveur API local).

## Démarrage en arrière-plan (optionnel)
Si vous souhaitez lancer en arrière-plan et rediriger les logs:
```bash
nohup \
  "/Users/faizel/Documents/Mes documents/3_Dev/Projets/Smart Grocery/smart-pantry-pro/.claude/commands/start-smart-pantry.sh" \
  > "/Users/faizel/Documents/Mes documents/3_Dev/Projets/Smart Grocery/smart-pantry-pro/.claude/commands/dev.log" 2>&1 &
```

- Consulter les logs:
```bash
tail -f \
  "/Users/faizel/Documents/Mes documents/3_Dev/Projets/Smart Grocery/smart-pantry-pro/.claude/commands/dev.log"
```

- Arrêter les services (force si nécessaire):
```bash
lsof -ti tcp:3002,3003 | xargs -r kill -9
```

## Dépannage
- Port déjà pris: relancez la commande d'arrêt ci-dessus puis redémarrez.
- Variables d'environnement: le backend charge `.env.local` automatiquement (voir logs `dotenv`).
- Terminal interactif: sans `nohup`, laissez le terminal ouvert pendant le développement.

## Remarque
Si vous déplacez le dossier du projet, mettez à jour la variable `PROJECT_ROOT` dans `start-smart-pantry.sh`.

