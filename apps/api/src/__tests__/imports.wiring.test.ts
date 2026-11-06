jest.mock('uuid', () => ({ v4: () => '00000000-0000-4000-8000-000000000000' }));
jest.mock('../routes/imports.social.js',()=>({createImportsSocialRouter:jest.fn(()=>jest.requireActual<typeof import('express')>('express').Router())}));
jest.mock('../services/imports/index.js',()=>({defaultExtractionService:jest.fn(()=>({})),saveImportedDraftAsRecipe:jest.fn()}));
import { createApp } from '../app.js';
import { createImportsSocialRouter } from '../routes/imports.social.js';
import { saveImportedDraftAsRecipe } from '../services/imports/index.js';

test('production app factory wires the same real save dependency into stable and v1 imports',()=>{
 (createImportsSocialRouter as jest.Mock).mockClear();
 createApp({skipV1:true});
 const calls=(createImportsSocialRouter as jest.Mock).mock.calls;
 expect(calls).toHaveLength(2);
 expect(calls[0][1].saveImportedDraftAsRecipe).toBe(saveImportedDraftAsRecipe);
 expect(calls[1][1].saveImportedDraftAsRecipe).toBe(saveImportedDraftAsRecipe);
 expect(typeof calls[0][1].saveImportedDraftAsRecipe).toBe('function');
});
