// PRP-234 PR2 — la route `/kitchen/meal-planning` ne sert plus
// `CipherMealPlanningPage`. Le composant Menus V1 vit dans
// `kitchen/MenusPage.tsx`. L'URL reste stable pour préserver
// l'habitude utilisateur et la nav existante.
export { default } from './kitchen/MenusPage';
