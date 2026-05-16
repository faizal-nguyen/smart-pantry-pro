/**
 * PRP-223 PR7 — CookingJournalService.
 *
 * Owns `cooking_journal_entries`. PR5 wrote into this table directly from
 * the assistant `record_recipe_feedback` handler; PR7 moves that write
 * here and adds list/recent reads. Existing data is unaffected — the
 * row shape is identical.
 *
 * Cursor pagination follows the same scheme as `MemoryService`
 * (created_at|id base64url). User scoping is explicit in every query
 * even though we use the admin client (RLS is SELECT-only).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase.js';

type Tables = Database['public']['Tables'];
export type CookingJournalRow = Tables['cooking_journal_entries']['Row'];
type CookingJournalInsert = Tables['cooking_journal_entries']['Insert'];

export type CookingOutcome = NonNullable<CookingJournalRow['outcome']>;

export class CookingJournalServiceError extends Error {
  constructor(readonly code: 'DB_ERROR' | 'NOT_FOUND', message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'CookingJournalServiceError';
  }
}

interface RecordOpts {
  recipe_id?: string | null;
  recipe_title: string;
  outcome?: CookingOutcome | null;
  rating?: number | null;
  notes?: string | null;
  substitutions?: unknown[];
  adjustments?: Record<string, unknown>;
  would_cook_again?: boolean | null;
  created_from_message_id?: string | null;
  cooked_at?: string;
}

interface ListOpts {
  cursor?: string;
  limit?: number;
  recipe_id?: string;
}

interface CursorListResult<T> {
  items: T[];
  nextCursor: string | null;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function encodeCursor(createdAt: string, id: string): string {
  return Buffer.from(`${createdAt}|${id}`, 'utf8').toString('base64url');
}

function decodeCursor(raw: string): { createdAt: string; id: string } | null {
  try {
    const decoded = Buffer.from(raw, 'base64url').toString('utf8');
    const [createdAt, id] = decoded.split('|');
    if (!createdAt || !id) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

function normaliseLimit(limit?: number): number {
  if (!limit || limit <= 0) return DEFAULT_LIMIT;
  return Math.min(limit, MAX_LIMIT);
}

export class CookingJournalService {
  constructor(private readonly admin: SupabaseClient<Database>) {}

  async record(userId: string, opts: RecordOpts): Promise<CookingJournalRow> {
    const payload: CookingJournalInsert = {
      user_id: userId,
      recipe_id: opts.recipe_id ?? null,
      recipe_title: opts.recipe_title,
      outcome: opts.outcome ?? null,
      rating: opts.rating ?? null,
      notes: opts.notes ?? null,
      substitutions: (opts.substitutions ?? []) as CookingJournalInsert['substitutions'],
      adjustments: (opts.adjustments ?? {}) as CookingJournalInsert['adjustments'],
      would_cook_again: opts.would_cook_again ?? null,
      created_from_message_id: opts.created_from_message_id ?? null,
      cooked_at: opts.cooked_at,
    };
    const { data, error } = await this.admin
      .from('cooking_journal_entries')
      .insert(payload)
      .select('*')
      .single();
    if (error || !data) {
      throw new CookingJournalServiceError(
        'DB_ERROR',
        'cooking_journal_entries.insert failed',
        error,
      );
    }
    return data;
  }

  async list(userId: string, opts: ListOpts = {}): Promise<CursorListResult<CookingJournalRow>> {
    const limit = normaliseLimit(opts.limit);
    // Apply filters before the terminal .limit() call so the supabase
    // chain still has eq/lt available.
    let q = this.admin.from('cooking_journal_entries').select('*').eq('user_id', userId);
    if (opts.recipe_id) q = q.eq('recipe_id', opts.recipe_id);
    if (opts.cursor) {
      const cur = decodeCursor(opts.cursor);
      if (cur) q = q.lt('cooked_at', cur.createdAt);
    }
    const { data, error } = await q
      .order('cooked_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1);
    if (error) {
      throw new CookingJournalServiceError('DB_ERROR', 'cooking_journal_entries.list failed', error);
    }
    const rows = data ?? [];
    if (rows.length <= limit) return { items: rows, nextCursor: null };
    const items = rows.slice(0, limit);
    const last = items[items.length - 1]!;
    return { items, nextCursor: encodeCursor(last.cooked_at, last.id) };
  }

  async getRecent(userId: string, limit: number): Promise<CookingJournalRow[]> {
    const { data, error } = await this.admin
      .from('cooking_journal_entries')
      .select('*')
      .eq('user_id', userId)
      .order('cooked_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(Math.max(1, Math.min(limit, MAX_LIMIT)));
    if (error) {
      throw new CookingJournalServiceError(
        'DB_ERROR',
        'cooking_journal_entries.getRecent failed',
        error,
      );
    }
    return data ?? [];
  }
}
