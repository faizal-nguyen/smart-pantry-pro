# dev-pages

Pages utilitaires non routées en production. Conservées pour debug local
uniquement. Aucune ne doit être importée depuis `src/App.tsx`.

Pour les router en dev, ajouter un `if (import.meta.env.DEV)` dans
`src/App.tsx` qui les expose via `withSuspense`.
