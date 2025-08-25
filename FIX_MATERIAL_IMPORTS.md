# Fix Material Imports

## Files that need import fixes:

### Files using MaterialCard/MaterialButton but with wrong imports:
1. **ShoppingList.tsx** - ✅ Fixed (added MaterialCard, MaterialButton imports)
2. **Recipes.tsx** - ✅ Fixed (added MaterialCard, MaterialButton imports)

### Files that may have been partially migrated:
These files still have old imports but may have Material components in use:

1. **SmartShoppingList.tsx** - Uses ShoppingList component (which now needs Material imports)
2. **RecipeAssistant.tsx** - Has old Card/Button imports
3. **RecipeDetail.tsx** - Has old Card/Button imports 
4. **RecipeEdit.tsx** - Has old Card/Button imports
5. **Settings.tsx** - Has old Card/Button imports
6. **RecipeSeeding.tsx** - Has old Card/Button imports
7. **EnhancedShoppingList.tsx** - Has old Card/Button imports
8. **VideoImportTest.tsx** - Has old Card/Button imports
9. **CameraPage.tsx** - Has old Card/Button imports
10. **AIAssistant.tsx** - Has old Button import

## Action taken:
- Fixed ShoppingList.tsx by adding Material imports
- Fixed Recipes.tsx by updating imports to Material components

## Next steps:
- Check each file to see if it actually uses MaterialCard/MaterialButton
- Update imports only for files that have been migrated
- Keep old imports for files that haven't been migrated yet