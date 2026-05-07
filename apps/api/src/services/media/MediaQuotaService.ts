import type { UserTier } from '../../middleware/userRateLimit.js';

export interface MediaUsage {
  imageBytes: number;
  videoBytes: number;
  videoSeconds: number;
}

export interface MediaQuota {
  maxImageBytes: number;
  maxVideoBytes: number;
  maxVideoSeconds: number;
  maxSingleVideoBytes: number;
}

export interface MediaUsageRepository {
  getUsage(userId: string): Promise<MediaUsage>;
}

export interface QuotaDecision {
  allowed: boolean;
  code?: 'IMAGE_QUOTA_EXCEEDED' | 'VIDEO_QUOTA_EXCEEDED' | 'VIDEO_DURATION_QUOTA_EXCEEDED' | 'VIDEO_FILE_TOO_LARGE';
  message?: string;
  quota: MediaQuota;
  usage: MediaUsage;
}

const MB = 1024 * 1024;
const GB = 1024 * MB;

export const MEDIA_QUOTAS: Record<UserTier, MediaQuota> = {
  free: {
    maxImageBytes: 250 * MB,
    maxVideoBytes: 250 * MB,
    maxVideoSeconds: 5 * 60,
    // Conservative V1 multipart limit compatible with Supabase Storage Free.
    maxSingleVideoBytes: 50 * MB,
  },
  premium: {
    maxImageBytes: 10 * GB,
    maxVideoBytes: 10 * GB,
    maxVideoSeconds: 300 * 60,
    maxSingleVideoBytes: 500 * MB,
  },
};

export class MediaQuotaService {
  constructor(private readonly usageRepository: MediaUsageRepository) {}

  async checkImageUpload(input: {
    userId: string;
    tier: UserTier;
    byteSize: number;
  }): Promise<QuotaDecision> {
    const quota = MEDIA_QUOTAS[input.tier];
    const usage = await this.usageRepository.getUsage(input.userId);
    if (usage.imageBytes + input.byteSize > quota.maxImageBytes) {
      return {
        allowed: false,
        code: 'IMAGE_QUOTA_EXCEEDED',
        message: 'Quota images depasse.',
        quota,
        usage,
      };
    }
    return { allowed: true, quota, usage };
  }

  async checkVideoUpload(input: {
    userId: string;
    tier: UserTier;
    byteSize: number;
    durationSeconds: number;
  }): Promise<QuotaDecision> {
    const quota = MEDIA_QUOTAS[input.tier];
    const usage = await this.usageRepository.getUsage(input.userId);

    if (input.byteSize > quota.maxSingleVideoBytes) {
      return {
        allowed: false,
        code: 'VIDEO_FILE_TOO_LARGE',
        message: 'Fichier video trop volumineux pour ce plan.',
        quota,
        usage,
      };
    }

    if (usage.videoBytes + input.byteSize > quota.maxVideoBytes) {
      return {
        allowed: false,
        code: 'VIDEO_QUOTA_EXCEEDED',
        message: 'Quota stockage video depasse.',
        quota,
        usage,
      };
    }

    if (usage.videoSeconds + input.durationSeconds > quota.maxVideoSeconds) {
      return {
        allowed: false,
        code: 'VIDEO_DURATION_QUOTA_EXCEEDED',
        message: 'Quota de minutes video depasse.',
        quota,
        usage,
      };
    }

    return { allowed: true, quota, usage };
  }
}

