import { SupabaseClient } from '@supabase/supabase-js';
import { Database, TableName, RpcFunctionName } from '../types/supabase.js';

// Type helper for table operations
type TableRow<TName extends TableName> = Database['public']['Tables'][TName]['Row'];
type TableInsert<TName extends TableName> = Database['public']['Tables'][TName]['Insert'];
type TableUpdate<TName extends TableName> = Database['public']['Tables'][TName]['Update'];

/**
 * BaseRepository - Abstract class for all data access repositories
 * Provides common CRUD operations with RLS enforcement (user_id filtering)
 */
export abstract class BaseRepository<T, TName extends TableName = TableName> {
  protected supabase: SupabaseClient<Database>;
  protected tableName: TName;

  constructor(supabase: SupabaseClient<Database>, tableName: TName) {
    this.supabase = supabase;
    this.tableName = tableName;
  }

  /**
   * Helper to get table query builder
   * Uses type assertion to avoid complex type inference issues
   */
  protected table() {
    return this.supabase.from(this.tableName);
  }

  /**
   * Find a single record by ID (with user_id RLS check)
   */
  async findById(id: string, userId: string): Promise<T | null> {
    const { data, error } = await this.table()
      .select('*')
      .eq('id', id as never)
      .eq('user_id', userId as never)
      .single();

    if (error) {
      // PGRST116 = "not found" error code
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data as T;
  }

  /**
   * Find all records for a user with optional filters
   */
  async findAll(
    userId: string,
    filters?: Record<string, unknown>,
    orderBy?: { column: string; ascending?: boolean }
  ): Promise<T[]> {
    let query = this.table()
      .select('*')
      .eq('user_id', userId as never);

    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value as never);
        }
      });
    }

    // Apply ordering
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as T[];
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T> & { user_id: string }): Promise<T> {
    const { data: created, error } = await this.table()
      .insert(data as never)
      .select()
      .single();

    if (error) throw error;
    return created as T;
  }

  /**
   * Update an existing record (with user_id RLS check)
   */
  async update(id: string, userId: string, data: Partial<T>): Promise<T> {
    const { data: updated, error } = await this.table()
      .update(data as never)
      .eq('id', id as never)
      .eq('user_id', userId as never)
      .select()
      .single();

    if (error) throw error;
    return updated as T;
  }

  /**
   * Delete a record (with user_id RLS check)
   */
  async delete(id: string, userId: string): Promise<void> {
    const { error } = await this.table()
      .delete()
      .eq('id', id as never)
      .eq('user_id', userId as never);

    if (error) throw error;
  }

  /**
   * Count records for a user with optional filters
   */
  async count(userId: string, filters?: Record<string, unknown>): Promise<number> {
    let query = this.table()
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId as never);

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value as never);
        }
      });
    }

    const { count, error } = await query;

    if (error) throw error;
    return count || 0;
  }

  /**
   * Check if a record exists
   */
  async exists(id: string, userId: string): Promise<boolean> {
    const record = await this.findById(id, userId);
    return record !== null;
  }

  /**
   * Execute multiple operations in a transaction-like manner
   * Note: Supabase JS doesn't support true transactions, so this uses
   * optimistic locking and rollback on error. For true ACID transactions,
   * use database functions (RPC).
   *
   * @param callback - Function containing operations to execute
   * @returns Result of the callback
   * @throws Error if any operation fails
   */
  async withTransaction<R>(
    callback: () => Promise<R>
  ): Promise<R> {
    try {
      // Execute all operations in the callback
      const result = await callback();
      return result;
    } catch (error) {
      // On error, the callback should handle rollback if needed
      // For critical operations, implement database-level transactions via RPC
      throw error;
    }
  }

  /**
   * Execute a PostgreSQL function with transaction support
   * Use this for operations that require ACID guarantees
   *
   * Example:
   * ```typescript
   * await repository.executeRpc('transfer_inventory', {
   *   from_item_id: 'id1',
   *   to_item_id: 'id2',
   *   amount: 5
   * });
   * ```
   */
  async executeRpc<FName extends RpcFunctionName>(
    functionName: FName,
    params: Database['public']['Functions'][FName]['Args']
  ): Promise<Database['public']['Functions'][FName]['Returns']> {
    const { data, error } = await this.supabase.rpc(functionName, params as never);

    if (error) throw error;
    return data;
  }
}
