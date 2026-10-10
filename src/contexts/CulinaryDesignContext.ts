import { createContext, useContext } from 'react';

/** The fixture compares both layouts; the app uses Cuisine personnelle. */
export const CulinaryDesignContext = createContext<'personal' | 'notebook'>('personal');
export const useCulinaryDesign = () => useContext(CulinaryDesignContext);
