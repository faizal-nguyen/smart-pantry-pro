import {createContext} from 'react';
import type {useRecipeLifecycleData} from '@/hooks/useRecipeLifecycle';
export const RecipeLifecycleContext=createContext<ReturnType<typeof useRecipeLifecycleData>|null>(null);
