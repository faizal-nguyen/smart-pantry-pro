import type {ReactNode} from 'react';
import {RecipeLifecycleContext} from '@/contexts/RecipeLifecycleContext';
import {useRecipeLifecycleData} from '@/hooks/useRecipeLifecycle';
export default function RecipeLifecycleProvider({children}:{children:ReactNode}){
  const value=useRecipeLifecycleData();return <RecipeLifecycleContext.Provider value={value}>{children}</RecipeLifecycleContext.Provider>;
}
