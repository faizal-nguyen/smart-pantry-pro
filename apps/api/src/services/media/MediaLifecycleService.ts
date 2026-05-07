import type { SupabaseClient } from '@supabase/supabase-js';

import { MediaAssetRepository, type MediaAssetRow } from './MediaAssetRepository.js';
import { MediaServiceError } from './MediaUploadService.js';

export class MediaLifecycleService {
  private readonly repository: MediaAssetRepository;

  constructor(
    private readonly userClient: SupabaseClient<any, any, any>,
    private readonly adminClient: SupabaseClient<any, any, any>
  ) {
    this.repository = new MediaAssetRepository(userClient);
  }

  async deleteOwnedAsset(userId: string, assetId: string): Promise<MediaAssetRow> {
    const asset = await this.repository.findOwnedAsset(userId, assetId);
    if (!asset) {
      throw new MediaServiceError('MEDIA_ASSET_NOT_FOUND', 'Media introuvable.', 404);
    }

    if (asset.storage_bucket && asset.storage_key) {
      const { error } = await this.adminClient.storage
        .from(asset.storage_bucket)
        .remove([asset.storage_key]);
      if (error) {
        throw new MediaServiceError('STORAGE_DELETE_FAILED', error.message || 'Suppression storage impossible.', 500);
      }
    }

    await this.repository.softDelete(userId, assetId);
    return asset;
  }

  async createSignedUrl(userId: string, assetId: string, expiresInSeconds = 3600): Promise<{
    asset: MediaAssetRow;
    signedUrl: string;
    expiresInSeconds: number;
  }> {
    const asset = await this.repository.findOwnedAsset(userId, assetId);
    if (!asset) {
      throw new MediaServiceError('MEDIA_ASSET_NOT_FOUND', 'Media introuvable.', 404);
    }
    if (!asset.storage_bucket || !asset.storage_key) {
      throw new MediaServiceError('MEDIA_ASSET_NOT_STORED', 'Ce media ne pointe pas vers un fichier stocke.', 400);
    }

    const { data, error } = await this.adminClient.storage
      .from(asset.storage_bucket)
      .createSignedUrl(asset.storage_key, expiresInSeconds);
    if (error || !data?.signedUrl) {
      throw new MediaServiceError('SIGNED_URL_FAILED', error?.message || 'URL signee impossible.', 500);
    }

    return { asset, signedUrl: data.signedUrl, expiresInSeconds };
  }
}

