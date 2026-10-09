import { z } from 'zod';
import { importsApi } from './recipe-import/api';
import { supabase } from '@/integrations/supabase/client';
import { readOwnedValue, writeOwnedValue, removeOwnedValue } from '@/lib/ownedStorage';
const Schema = z.object({ id:z.string().uuid(),owner:z.string().uuid().nullable(),source:z.string().url(),destination:z.string(),status:z.enum(['draft','capturing','failed','captured','saved']),import_id:z.string().nullable(),recipe_id:z.string().nullable(),duplicate:z.boolean(),error:z.string().nullable() });
export type ShareCapture = z.infer<typeof Schema>;
export function readShareCapture(owner:string): ShareCapture|null {
  const value = readOwnedValue(owner,'share-capture',null);
  if (!value) return null;
  const capture = Schema.parse(value);
  if (capture.owner !== (owner==='anonymous' ? null : owner)) throw new Error('Le partage appartient à un autre compte.');
  return capture;
}
/** Persist before any auth redirect. A previous owned capture is never adopted. */
export function beginShareCapture(source:string,owner?:string): ShareCapture {
  const previous = readShareCapture(owner ?? 'anonymous');
  if (previous && previous.source===source) return previous;
  if (previous && !['captured','saved'].includes(previous.status)) throw new Error('Un partage précédent reste à reprendre. Il est conservé.');
  const capture = Schema.parse({ id:crypto.randomUUID(),owner:owner ?? null,source,destination:'/kitchen/recipes?tab=import',status:'draft',import_id:null,recipe_id:null,duplicate:false,error:null });
  writeOwnedValue(owner ?? 'anonymous','share-capture',capture);
  return capture;
}
export function bindShareCapture(owner:string): ShareCapture|null {
  const own = readShareCapture(owner);
  const anonymous = readShareCapture('anonymous');
  if (!anonymous) return own;
  if (own && own.id!==anonymous.id && !['captured','saved'].includes(own.status)) throw new Error('Un partage de ce compte reste à reprendre avant le nouveau lien.');
  const bound = { ...anonymous,owner };
  writeOwnedValue(owner,'share-capture',bound); removeOwnedValue('anonymous','share-capture');
  return bound;
}
export async function captureSharedRecipe(owner:string): Promise<ShareCapture> {
  const previous = readShareCapture(owner);
  if (!previous) throw new Error('Aucun lien sauvegardé à reprendre.');
  if ((await supabase.auth.getSession()).data.session?.user.id !== owner) throw new Error('Reconnectez-vous au compte de ce partage.');
  if (['captured','saved'].includes(previous.status)) return previous;
  writeOwnedValue(owner,'share-capture',{ ...previous,status:'capturing',error:null });
  try {
    const response = await importsApi.capture(previous.source,'share_target',owner);
    if ((await supabase.auth.getSession()).data.session?.user.id !== owner) throw new Error('Le compte a changé. Reprenez le partage avec son propriétaire.');
    const capture:ShareCapture = { ...previous,status:response.import.recipe_id ? 'saved' : 'captured',import_id:response.import.id,recipe_id:response.import.recipe_id,
      duplicate:response.duplicate,destination:response.import.recipe_id ? `/kitchen/recipes/${response.import.recipe_id}` : `/kitchen/recipes?tab=import&import=${response.import.id}`,error:null };
    writeOwnedValue(owner,'share-capture',capture);
    return capture;
  } catch (failure) {
    const error = failure instanceof Error ? failure.message : 'Capture impossible. Votre lien reste conservé.';
    writeOwnedValue(owner,'share-capture',{ ...previous,status:'failed',error }); throw failure;
  }
}
