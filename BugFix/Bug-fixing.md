Sur la page /demo/material-you, aucun bouton ne fonctionne. 
Voici les logs 
react-router-dom.js?v=ffcb2257:4393 ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.

color-utils.ts:28 Invalid hex color: #100b010, using fallback
DynamicColorEngine.ts:132 Error extracting color scheme: Error: unexpected hex 100b010
    at DynamicColorEngine.generateFoodAccentColors (DynamicColorEngine.ts:253:35)
    at DynamicColorEngine.createColorScheme (DynamicColorEngine.ts:169:14)
    at DynamicColorEngine.extractColorScheme (DynamicColorEngine.ts:125:32)
    at async MaterialYouThemeContext.tsx:137:22
color-utils.ts:28 Invalid hex color: #100b010, using fallback
DynamicColorEngine.ts:132 Error extracting color scheme: Error: unexpected hex 100b010
    at DynamicColorEngine.generateFoodAccentColors (DynamicColorEngine.ts:253:35)
    at DynamicColorEngine.createColorScheme (DynamicColorEngine.ts:169:14)
    at DynamicColorEngine.extractColorScheme (DynamicColorEngine.ts:125:32)
    at async MaterialYouThemeContext.tsx:137:22

Il faut fix ici et apres verifie que sur chaque page de l'appli, c'est bien implémenté.