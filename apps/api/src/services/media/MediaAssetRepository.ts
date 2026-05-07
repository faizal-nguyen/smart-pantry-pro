import type { SupabaseClient } from '@supabase/supabase-js';

import type { MediaUsage, MediaUsageRepository } from './MediaQuotaService.js';

export interface MediaAssetRow {
  id: string;
  user_id: string;
  import_id: string | null;
  recipe_id: string | null;
  kind: string;
  origin: string;
  rights_status: string;
  rights_basis: string | null;
  rights_policy_version: string | null;
  rights_attested_at: string | null;
  storage_provider: string | null;
  storage_bucket: string | null;
  storage_key: string | null;
  public_url: string | null;
  source_url: string | null;
  mime_type: string | null;
  byte_size: number | null;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  checksum_sha256: string | null;
  metadata: Record<string, unknown>;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMediaAssetInput {
  userId: string;
  importId?: string | null;
  recipeId?: string | null;
  kind: 'thumbnail' | 'cover' | 'image' | 'video' | 'audio' | 'transcript' | 'embed_snapshot';
  origin: string;
  rightsStatus: string;
  rightsBasis?: string | null;
  rightsPolicyVersion?: string | null;
  rightsAttestedAt?: string | null;
  storageProvider?: string | null;
  storageBucket?: string | null;
  storageKey?: string | null;
  publicUrl?: string | null;
  sourceUrl?: string | null;
  mimeType?: string | null;
  byteSize?: number | null;
  durationSeconds?: number | null;
  width?: number | null;
  height?: number | null;
  checksumSha256?: string | null;
  metadata?: Record<string, unknown>;
}

export class MediaAssetRepository implements MediaUsageRepository {
  constructor(private readonly client: SupabaseClient<any, any, any>) {}

  async createAsset(input: CreateMediaAssetInput): Promise<MediaAssetRow> {
    const { data, error } = await this.client
      .from('media_assets')
      .insert({
        user_id: input.userId,
        import_id: input.importId ?? null,
        recipe_id: input.recipeId ?? null,
        kind: input.kind,
        origin: input.origin,
        rights_status: input.rightsStatus,
        rights_basis: input.rightsBasis ?? null,
        rights_policy_version: input.rightsPolicyVersion ?? null,
        rights_attested_at: input.rightsAttestedAt ?? null,
        storage_provider: input.storageProvider ?? null,
        storage_bucket: input.storageBucket ?? null,
        storage_key: input.storageKey ?? null,
        public_url: input.publicUrl ?? null,
        source_url: input.sourceUrl ?? null,
        mime_type: input.mimeType ?? null,
        byte_size: input.byteSize ?? null,
        duration_seconds: input.durationSeconds ?? null,
        width: input.width ?? null,
        height: input.height ?? null,
        checksum_sha256: input.checksumSha256 ?? null,
        metadata: input.metadata ?? {},
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as MediaAssetRow;
  }

  async createJob(input: {
    userId: string;
    mediaAssetId: string;
    jobType: 'thumbnail' | 'transcode' | 'scan' | 'delete' | 'transcript';
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ id: string }> {
    const { data, error } = await this.client
      .from('media_jobs')
      .insert({
        user_id: input.userId,
        media_asset_id: input.mediaAssetId,
        job_type: input.jobType,
        status: 'queued',
        idempotency_key: input.idempotencyKey,
        metadata: input.metadata ?? {},
      })
      .select('id')
      .single();

    if (error) throw error;
    return data as { id: string };
  }

  async getUsage(userId: string): Promise<MediaUsage> {
    const { data, error } = await this.client
      .from('media_assets')
      .select('kind, byte_size, duration_seconds')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (error) throw error;

    return ((data ?? []) as Array<{ kind: string; byte_size: number | null; duration_seconds: number | null }>)
      .reduce<MediaUsage>(
        (usage, row) => {
          const bytes = row.byte_size ?? 0;
          if (row.kind === 'video') {
            usage.videoBytes += bytes;
            usage.videoSeconds += row.duration_seconds ?? 0;
          } else if (row.kind === 'image' || row.kind === 'cover' || row.kind === 'thumbnail') {
            usage.imageBytes += bytes;
          }
          return usage;
        },
        { imageBytes: 0, videoBytes: 0, videoSeconds: 0 }
      );
  }

  async findOwnedAsset(userId: string, assetId: string): Promise<MediaAssetRow | null> {
    const { data, error } = await this.client
      .from('media_assets')
      .select('*')
      .eq('id', assetId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    return (data as MediaAssetRow | null) ?? null;
  }

  async softDelete(userId: string, assetId: string): Promise<void> {
    const { error } = await this.client
      .from('media_assets')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', assetId)
      .eq('user_id', userId);

    if (error) throw error;
  }
}

