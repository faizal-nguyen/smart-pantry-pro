import { MemoryCommandSchema, type MemoryCommand } from '@smart/shared';
const TTL_MS = 24 * 3600 * 1000;
const key = (owner: string) => 'assistant-memory-command:' + owner;
export function readPendingMemoryCommand(owner: string): MemoryCommand | null {
  const raw = sessionStorage.getItem(key(owner));
  if (!raw) return null;
  const entry = JSON.parse(raw) as { owner: string; at: number; command: unknown };
  if (entry.owner !== owner || !Number.isFinite(entry.at) || Date.now() - entry.at > TTL_MS) {
    sessionStorage.removeItem(key(owner)); return null;
  }
  return MemoryCommandSchema.parse(entry.command);
}
export function storePendingMemoryCommand(owner: string, command: MemoryCommand): void {
  const raw = JSON.stringify({ owner, at: Date.now(), command: MemoryCommandSchema.parse(command) });
  try {
    sessionStorage.setItem(key(owner), raw);
    if (sessionStorage.getItem(key(owner)) !== raw) throw new Error();
  } catch { throw new Error('Impossible de conserver la commande sur cet appareil. Aucune modification n’a été envoyée.'); }
}
export function clearPendingMemoryCommand(owner: string): void { sessionStorage.removeItem(key(owner)); }
