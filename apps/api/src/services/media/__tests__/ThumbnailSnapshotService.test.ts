import { ThumbnailSnapshotService } from '../ThumbnailSnapshotService.js';

// 1x1 transparent PNG
const PNG_1x1 = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
    '0000000d49444154789c63600100000005000172bf04020000000049454e44ae426082',
  'hex'
);

const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);

interface InsertCall {
  payload: Record<string, unknown>;
}

function makeUserClient(insertCalls: InsertCall[], opts: { failInsert?: boolean } = {}) {
  return {
    from(table: string) {
      if (table !== 'media_assets') {
        throw new Error(`unexpected table: ${table}`);
      }
      return {
        insert(payload: Record<string, unknown>) {
          insertCalls.push({ payload });
          return {
            select() {
              return {
                async single() {
                  if (opts.failInsert) {
                    return { data: null, error: { message: 'rls denied' } };
                  }
                  return {
                    data: {
                      id: 'asset-uuid',
                      ...payload,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                      deleted_at: null,
                    },
                    error: null,
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

function makeAdminClient(uploadCalls: Array<{ key: string; buffer: Buffer; contentType: string }>, removeCalls: string[][], opts: { failUpload?: boolean } = {}) {
  return {
    storage: {
      from(bucket: string) {
        return {
          async upload(
            key: string,
            buffer: Buffer,
            options: { contentType: string }
          ): Promise<{ error: { message: string } | null }> {
            uploadCalls.push({ key, buffer, contentType: options.contentType });
            if (opts.failUpload) return { error: { message: 'storage failed' } };
            return { error: null };
          },
          async remove(keys: string[]): Promise<{ error: null }> {
            removeCalls.push(keys);
            return { error: null };
          },
        };
      },
    },
    _bucket: 'recipe-media',
  };
}

function makeFetchOk(body: Buffer) {
  return jest.fn(async () => {
    return new Response(new Uint8Array(body), { status: 200, headers: { 'content-type': 'image/png' } });
  });
}

describe('ThumbnailSnapshotService', () => {
  it('persists a fetched PNG as a thumbnail_snapshot media asset', async () => {
    const insertCalls: InsertCall[] = [];
    const uploadCalls: Array<{ key: string; buffer: Buffer; contentType: string }> = [];
    const removeCalls: string[][] = [];

    const service = new ThumbnailSnapshotService(
      makeUserClient(insertCalls) as any,
      makeAdminClient(uploadCalls, removeCalls) as any,
      { fetchImpl: makeFetchOk(PNG_1x1) as any }
    );

    const result = await service.snapshot({
      userId: 'user-1',
      importId: 'import-1',
      remoteUrl: 'https://scontent.cdninstagram.com/t/og.jpg?oh=abc&oe=def',
      sourceUrl: 'https://www.instagram.com/reel/DW1P7ooCGeq',
    });

    expect(result).not.toBeNull();
    expect(result?.mediaAssetId).toBe('asset-uuid');
    expect(result?.mimeType).toBe('image/png');
    expect(uploadCalls).toHaveLength(1);
    expect(uploadCalls[0].key).toMatch(/^users\/user-1\/thumbnail\/\d{4}\/\d{2}\/og-[a-f0-9-]+\.png$/);
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].payload).toMatchObject({
      user_id: 'user-1',
      import_id: 'import-1',
      kind: 'thumbnail',
      origin: 'thumbnail_snapshot',
      rights_status: 'platform_embed',
      rights_basis: null,
      source_url: 'https://www.instagram.com/reel/DW1P7ooCGeq',
      mime_type: 'image/png',
      storage_provider: 'supabase',
    });
    expect(removeCalls).toHaveLength(0);
  });

  it('falls back to remoteUrl as source_url when sourceUrl is not provided', async () => {
    const insertCalls: InsertCall[] = [];
    const service = new ThumbnailSnapshotService(
      makeUserClient(insertCalls) as any,
      makeAdminClient([], []) as any,
      { fetchImpl: makeFetchOk(JPEG_HEADER) as any }
    );

    const result = await service.snapshot({
      userId: 'user-1',
      importId: 'import-1',
      remoteUrl: 'https://cdn.tiktok.com/foo.jpg',
    });

    expect(result?.mimeType).toBe('image/jpeg');
    expect(insertCalls[0].payload.source_url).toBe('https://cdn.tiktok.com/foo.jpg');
  });

  it('returns null and does not persist when the URL is SSRF-blocked', async () => {
    const insertCalls: InsertCall[] = [];
    const uploadCalls: Array<{ key: string; buffer: Buffer; contentType: string }> = [];
    const fetchSpy = jest.fn();

    const service = new ThumbnailSnapshotService(
      makeUserClient(insertCalls) as any,
      makeAdminClient(uploadCalls, []) as any,
      { fetchImpl: fetchSpy as any }
    );

    const result = await service.snapshot({
      userId: 'user-1',
      importId: 'import-1',
      remoteUrl: 'http://169.254.169.254/latest/meta-data/',
    });

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(uploadCalls).toHaveLength(0);
    expect(insertCalls).toHaveLength(0);
  });

  it('returns null when the fetch responds with a non-2xx', async () => {
    const fetchImpl = jest.fn(async () => new Response(null, { status: 403 }));
    const insertCalls: InsertCall[] = [];

    const service = new ThumbnailSnapshotService(
      makeUserClient(insertCalls) as any,
      makeAdminClient([], []) as any,
      { fetchImpl: fetchImpl as any }
    );

    const result = await service.snapshot({
      userId: 'user-1',
      importId: 'import-1',
      remoteUrl: 'https://cdn.example.com/expired.jpg',
    });

    expect(result).toBeNull();
    expect(insertCalls).toHaveLength(0);
  });

  it('rejects payloads larger than the configured cap and returns null', async () => {
    const oversized = Buffer.alloc(20, 0xff);
    const fetchImpl = jest.fn(async () => new Response(new Uint8Array(oversized), { status: 200 }));
    const insertCalls: InsertCall[] = [];

    const service = new ThumbnailSnapshotService(
      makeUserClient(insertCalls) as any,
      makeAdminClient([], []) as any,
      { fetchImpl: fetchImpl as any, maxBytes: 8 }
    );

    const result = await service.snapshot({
      userId: 'user-1',
      importId: 'import-1',
      remoteUrl: 'https://cdn.example.com/huge.jpg',
    });

    expect(result).toBeNull();
    expect(insertCalls).toHaveLength(0);
  });

  it('returns null when the bytes do not match a supported image MIME', async () => {
    const html = Buffer.from('<!doctype html>...');
    const fetchImpl = jest.fn(async () => new Response(new Uint8Array(html), { status: 200 }));
    const insertCalls: InsertCall[] = [];

    const service = new ThumbnailSnapshotService(
      makeUserClient(insertCalls) as any,
      makeAdminClient([], []) as any,
      { fetchImpl: fetchImpl as any }
    );

    const result = await service.snapshot({
      userId: 'user-1',
      importId: 'import-1',
      remoteUrl: 'https://cdn.example.com/foo.jpg',
    });

    expect(result).toBeNull();
    expect(insertCalls).toHaveLength(0);
  });

  it('cleans up the orphaned storage object when the asset insert fails', async () => {
    const insertCalls: InsertCall[] = [];
    const uploadCalls: Array<{ key: string; buffer: Buffer; contentType: string }> = [];
    const removeCalls: string[][] = [];

    const service = new ThumbnailSnapshotService(
      makeUserClient(insertCalls, { failInsert: true }) as any,
      makeAdminClient(uploadCalls, removeCalls) as any,
      { fetchImpl: makeFetchOk(PNG_1x1) as any }
    );

    const result = await service.snapshot({
      userId: 'user-1',
      importId: 'import-1',
      remoteUrl: 'https://cdn.example.com/og.png',
    });

    expect(result).toBeNull();
    expect(uploadCalls).toHaveLength(1);
    expect(removeCalls).toHaveLength(1);
    expect(removeCalls[0][0]).toBe(uploadCalls[0].key);
  });

  it('returns null when the storage upload fails', async () => {
    const insertCalls: InsertCall[] = [];
    const uploadCalls: Array<{ key: string; buffer: Buffer; contentType: string }> = [];
    const removeCalls: string[][] = [];

    const service = new ThumbnailSnapshotService(
      makeUserClient(insertCalls) as any,
      makeAdminClient(uploadCalls, removeCalls, { failUpload: true }) as any,
      { fetchImpl: makeFetchOk(PNG_1x1) as any }
    );

    const result = await service.snapshot({
      userId: 'user-1',
      importId: 'import-1',
      remoteUrl: 'https://cdn.example.com/og.png',
    });

    expect(result).toBeNull();
    expect(uploadCalls).toHaveLength(1);
    expect(insertCalls).toHaveLength(0);
    expect(removeCalls).toHaveLength(0);
  });
});
