import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserTier } from '../../middleware/userRateLimit.js';

import {
  canPersistMedia,
  normalizeRightsAttestation,
  type MediaOrigin,
  type RightsAttestation,
} from './MediaRightsPolicy.js';
import { MediaQuotaService } from './MediaQuotaService.js';
import { MediaAssetRepository, type MediaAssetRow } from './MediaAssetRepository.js';
import { readVideoMetadataFromBuffer } from './MediaMetadataService.js';

export class MediaServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400
  ) {
    super(message);
  }
}

interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface UploadMediaContext {
  userId: string;
  tier: UserTier;
  importId?: string;
  recipeId?: string;
  sourceUrl?: string;
}

const IMAGE_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

const VIDEO_MIME_TO_EXT: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function slugifyFileName(originalName: string): string {
  const parsed = path.parse(originalName);
  const base = parsed.name
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 72);
  return base || 'media';
}

function buildStorageKey(input: {
  userId: string;
  kind: 'image' | 'video';
  originalName: string;
  extension: string;
}): string {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  return [
    'users',
    input.userId,
    input.kind,
    yyyy,
    mm,
    `${slugifyFileName(input.originalName)}-${randomUUID()}.${input.extension}`,
  ].join('/');
}

function sniffMime(buffer: Buffer, declaredMime: string): string | null {
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buffer.subarray(8, 12).toString('ascii').toLowerCase();
    if (brand.includes('heic') || brand.includes('heif') || brand.includes('mif1')) {
      return declaredMime === 'image/heic' || declaredMime === 'image/heif' ? declaredMime : 'image/heic';
    }
    return declaredMime === 'video/quicktime' ? 'video/quicktime' : 'video/mp4';
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (buffer.length >= 4 && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return 'video/webm';
  }
  return null;
}

function parseAttestation(value: unknown): RightsAttestation | null {
  if (typeof value === 'string') {
    try {
      return normalizeRightsAttestation(JSON.parse(value));
    } catch {
      return null;
    }
  }
  return normalizeRightsAttestation(value);
}

export class MediaUploadService {
  private readonly repository: MediaAssetRepository;
  private readonly quotaService: MediaQuotaService;

  constructor(
    private readonly userClient: SupabaseClient<any, any, any>,
    private readonly adminClient: SupabaseClient<any, any, any>,
    private readonly bucket = process.env.MEDIA_STORAGE_BUCKET || 'recipe-media'
  ) {
    this.repository = new MediaAssetRepository(userClient);
    this.quotaService = new MediaQuotaService(this.repository);
  }

  async uploadImage(input: UploadMediaContext & {
    file: UploadedFile;
    purpose: 'cover' | 'thumbnail' | 'image';
    rightsAttestation: unknown;
  }): Promise<MediaAssetRow> {
    const mimeType = sniffMime(input.file.buffer, input.file.mimetype);
    if (!mimeType || !IMAGE_MIME_TO_EXT[mimeType]) {
      throw new MediaServiceError('UNSUPPORTED_MEDIA_TYPE', 'Type image non supporte.', 415);
    }

    const rightsAttestation = parseAttestation(input.rightsAttestation);
    const decision = canPersistMedia({ origin: 'user_upload', rightsAttestation });
    if (!decision.allowed || !rightsAttestation) {
      throw new MediaServiceError(decision.code || 'RIGHTS_ATTESTATION_REQUIRED', decision.message || 'Attestation requise.', 403);
    }

    const quota = await this.quotaService.checkImageUpload({
      userId: input.userId,
      tier: input.tier,
      byteSize: input.file.size,
    });
    if (!quota.allowed) {
      throw new MediaServiceError(quota.code || 'MEDIA_QUOTA_EXCEEDED', quota.message || 'Quota depasse.', 402);
    }

    const extension = IMAGE_MIME_TO_EXT[mimeType];
    const storageKey = buildStorageKey({
      userId: input.userId,
      kind: 'image',
      originalName: input.file.originalname,
      extension,
    });

    await this.uploadToStorage(storageKey, input.file.buffer, mimeType);

    return this.repository.createAsset({
      userId: input.userId,
      importId: input.importId,
      recipeId: input.recipeId,
      kind: input.purpose,
      origin: 'user_upload',
      rightsStatus: 'user_provided',
      rightsBasis: rightsAttestation.rightsBasis,
      rightsPolicyVersion: rightsAttestation.policyVersion,
      rightsAttestedAt: rightsAttestation.attestedAt,
      storageProvider: 'supabase',
      storageBucket: this.bucket,
      storageKey,
      sourceUrl: input.sourceUrl ?? rightsAttestation.sourceUrl,
      mimeType,
      byteSize: input.file.size,
      checksumSha256: sha256(input.file.buffer),
      metadata: {
        originalName: input.file.originalname,
        rightsAttestation,
      },
    });
  }

  async uploadVideo(input: UploadMediaContext & {
    file: UploadedFile;
    origin?: MediaOrigin;
    rightsAttestation: unknown;
  }): Promise<{ asset: MediaAssetRow; thumbnailJobId: string }> {
    const mimeType = sniffMime(input.file.buffer, input.file.mimetype);
    if (!mimeType || !VIDEO_MIME_TO_EXT[mimeType]) {
      throw new MediaServiceError('UNSUPPORTED_MEDIA_TYPE', 'Type video non supporte.', 415);
    }

    const origin = input.origin || (input.sourceUrl ? 'personal_archive_upload' : 'user_upload');
    const rightsAttestation = parseAttestation(input.rightsAttestation);
    const decision = canPersistMedia({ origin, rightsAttestation });
    if (!decision.allowed || !rightsAttestation) {
      throw new MediaServiceError(decision.code || 'RIGHTS_ATTESTATION_REQUIRED', decision.message || 'Attestation requise.', 403);
    }

    const extension = VIDEO_MIME_TO_EXT[mimeType];
    const videoMetadata = await readVideoMetadataFromBuffer(input.file.buffer, extension);
    const quota = await this.quotaService.checkVideoUpload({
      userId: input.userId,
      tier: input.tier,
      byteSize: input.file.size,
      durationSeconds: videoMetadata.durationSeconds,
    });
    if (!quota.allowed) {
      throw new MediaServiceError(quota.code || 'MEDIA_QUOTA_EXCEEDED', quota.message || 'Quota depasse.', 402);
    }

    const storageKey = buildStorageKey({
      userId: input.userId,
      kind: 'video',
      originalName: input.file.originalname,
      extension,
    });

    await this.uploadToStorage(storageKey, input.file.buffer, mimeType);

    const asset = await this.repository.createAsset({
      userId: input.userId,
      importId: input.importId,
      recipeId: input.recipeId,
      kind: 'video',
      origin,
      rightsStatus: 'user_provided',
      rightsBasis: rightsAttestation.rightsBasis,
      rightsPolicyVersion: rightsAttestation.policyVersion,
      rightsAttestedAt: rightsAttestation.attestedAt,
      storageProvider: 'supabase',
      storageBucket: this.bucket,
      storageKey,
      sourceUrl: input.sourceUrl ?? rightsAttestation.sourceUrl,
      mimeType,
      byteSize: input.file.size,
      durationSeconds: videoMetadata.durationSeconds,
      width: videoMetadata.width,
      height: videoMetadata.height,
      checksumSha256: sha256(input.file.buffer),
      metadata: {
        originalName: input.file.originalname,
        rightsAttestation,
        archiveMode: origin === 'personal_archive_upload' ? 'personal' : 'upload',
        video: {
          codec: videoMetadata.videoCodec,
          audioCodec: videoMetadata.audioCodec,
          bitRate: videoMetadata.bitRate,
        },
      },
    });

    const thumbnailJob = await this.repository.createJob({
      userId: input.userId,
      mediaAssetId: asset.id,
      jobType: 'thumbnail',
      idempotencyKey: `thumbnail:${asset.id}`,
      metadata: {
        sourceStorageKey: storageKey,
        targetKind: 'thumbnail',
      },
    });

    return { asset, thumbnailJobId: thumbnailJob.id };
  }

  private async uploadToStorage(storageKey: string, buffer: Buffer, contentType: string): Promise<void> {
    const { error } = await this.adminClient.storage.from(this.bucket).upload(storageKey, buffer, {
      contentType,
      upsert: false,
      cacheControl: '31536000',
    });
    if (error) {
      throw new MediaServiceError('STORAGE_UPLOAD_FAILED', error.message || 'Upload storage impossible.', 500);
    }
  }
}

