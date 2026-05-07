import {
  MEDIA_QUOTAS,
  MediaQuotaService,
  type MediaUsage,
  type MediaUsageRepository,
} from '../MediaQuotaService.js';

class FakeUsageRepository implements MediaUsageRepository {
  constructor(private readonly usage: MediaUsage) {}

  async getUsage(): Promise<MediaUsage> {
    return this.usage;
  }
}

describe('MediaQuotaService', () => {
  it('accepts the Butter Chicken fixture under the free video quota', async () => {
    const service = new MediaQuotaService(new FakeUsageRepository({
      imageBytes: 0,
      videoBytes: 0,
      videoSeconds: 0,
    }));

    const decision = await service.checkVideoUpload({
      userId: 'user-1',
      tier: 'free',
      byteSize: 21_842_414,
      durationSeconds: 87,
    });

    expect(decision.allowed).toBe(true);
  });

  it('rejects free videos above the single-file V1 multipart limit', async () => {
    const service = new MediaQuotaService(new FakeUsageRepository({
      imageBytes: 0,
      videoBytes: 0,
      videoSeconds: 0,
    }));

    const decision = await service.checkVideoUpload({
      userId: 'user-1',
      tier: 'free',
      byteSize: MEDIA_QUOTAS.free.maxSingleVideoBytes + 1,
      durationSeconds: 30,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe('VIDEO_FILE_TOO_LARGE');
  });

  it('rejects free videos once the duration quota is exceeded', async () => {
    const service = new MediaQuotaService(new FakeUsageRepository({
      imageBytes: 0,
      videoBytes: 10,
      videoSeconds: MEDIA_QUOTAS.free.maxVideoSeconds - 10,
    }));

    const decision = await service.checkVideoUpload({
      userId: 'user-1',
      tier: 'free',
      byteSize: 10,
      durationSeconds: 11,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe('VIDEO_DURATION_QUOTA_EXCEEDED');
  });

  it('rejects image uploads above the image quota', async () => {
    const service = new MediaQuotaService(new FakeUsageRepository({
      imageBytes: MEDIA_QUOTAS.free.maxImageBytes,
      videoBytes: 0,
      videoSeconds: 0,
    }));

    const decision = await service.checkImageUpload({
      userId: 'user-1',
      tier: 'free',
      byteSize: 1,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe('IMAGE_QUOTA_EXCEEDED');
  });
});

