import { MediaAssetResolver } from '../MediaAssetResolver.js';

interface RowSpec {
  id: string;
  import_id: string | null;
  kind: string;
  origin: string;
  storage_bucket: string | null;
  storage_key: string | null;
  public_url: string | null;
  mime_type: string | null;
  created_at: string;
}

function makeUserClient(rows: RowSpec[], opts: { failQuery?: boolean } = {}) {
  return {
    from(table: string) {
      if (table !== 'media_assets') throw new Error(`unexpected table: ${table}`);
      const builder: any = {
        _selected: '*',
        _filters: [] as Array<{ col: string; op: string; val: unknown }>,
        select(cols: string) {
          builder._selected = cols;
          return builder;
        },
        in(col: string, val: unknown) {
          builder._filters.push({ col, op: 'in', val });
          return builder;
        },
        eq(col: string, val: unknown) {
          builder._filters.push({ col, op: 'eq', val });
          return builder;
        },
        is(col: string, val: unknown) {
          builder._filters.push({ col, op: 'is', val });
          return builder;
        },
        order() {
          return builder;
        },
        then(resolve: (v: { data: RowSpec[] | null; error: { message: string } | null }) => void) {
          if (opts.failQuery) {
            return resolve({ data: null, error: { message: 'rls denied' } });
          }
          // Apply filters loosely (just enough to match the resolver's call)
          const importIdsFilter = builder._filters.find(
            (f: any) => f.col === 'import_id' && f.op === 'in'
          )?.val as string[] | undefined;
          const kindFilter = builder._filters.find(
            (f: any) => f.col === 'kind' && f.op === 'eq'
          )?.val as string | undefined;
          const filtered = rows
            .filter((r) =>
              importIdsFilter ? r.import_id && importIdsFilter.includes(r.import_id) : true
            )
            .filter((r) => (kindFilter ? r.kind === kindFilter : true))
            .sort((a, b) => b.created_at.localeCompare(a.created_at));
          return resolve({ data: filtered, error: null });
        },
      };
      return builder;
    },
  };
}

function makeAdminClient(opts: { signedUrls?: Record<string, string>; failBatch?: boolean } = {}) {
  return {
    storage: {
      from(_bucket: string) {
        return {
          async createSignedUrls(paths: string[], _ttl: number) {
            if (opts.failBatch) return { data: null, error: { message: 'storage down' } };
            return {
              data: paths.map((p) => ({
                path: p,
                signedUrl: opts.signedUrls?.[p] ?? `https://signed.example.com${p}?sig=abc`,
                error: null,
              })),
              error: null,
            };
          },
        };
      },
    },
  };
}

describe('MediaAssetResolver', () => {
  it('returns an empty map when called with no import IDs', async () => {
    const resolver = new MediaAssetResolver(
      makeUserClient([]) as any,
      makeAdminClient() as any
    );
    const result = await resolver.resolveThumbnailsByImport([]);
    expect(result.size).toBe(0);
  });

  it('returns the latest snapshot per import with a signed URL', async () => {
    const rows: RowSpec[] = [
      {
        id: 'asset-old',
        import_id: 'imp-1',
        kind: 'thumbnail',
        origin: 'thumbnail_snapshot',
        storage_bucket: 'recipe-media',
        storage_key: 'users/u1/thumbnail/2026/05/og-old.jpg',
        public_url: null,
        mime_type: 'image/jpeg',
        created_at: '2026-05-01T00:00:00Z',
      },
      {
        id: 'asset-new',
        import_id: 'imp-1',
        kind: 'thumbnail',
        origin: 'thumbnail_snapshot',
        storage_bucket: 'recipe-media',
        storage_key: 'users/u1/thumbnail/2026/05/og-new.jpg',
        public_url: null,
        mime_type: 'image/jpeg',
        created_at: '2026-05-07T00:00:00Z',
      },
      {
        id: 'asset-other',
        import_id: 'imp-2',
        kind: 'thumbnail',
        origin: 'thumbnail_snapshot',
        storage_bucket: 'recipe-media',
        storage_key: 'users/u1/thumbnail/2026/05/og-other.png',
        public_url: null,
        mime_type: 'image/png',
        created_at: '2026-05-02T00:00:00Z',
      },
    ];

    const resolver = new MediaAssetResolver(
      makeUserClient(rows) as any,
      makeAdminClient() as any
    );
    const result = await resolver.resolveThumbnailsByImport(['imp-1', 'imp-2', 'imp-missing']);

    expect(result.size).toBe(2);
    expect(result.get('imp-1')?.mediaAssetId).toBe('asset-new');
    expect(result.get('imp-1')?.url).toContain('og-new.jpg');
    expect(result.get('imp-2')?.mediaAssetId).toBe('asset-other');
    expect(result.get('imp-missing')).toBeUndefined();
  });

  it('falls back to public_url for assets without a storage_key', async () => {
    const rows: RowSpec[] = [
      {
        id: 'asset-public',
        import_id: 'imp-1',
        kind: 'thumbnail',
        origin: 'thumbnail_snapshot',
        storage_bucket: null,
        storage_key: null,
        public_url: 'https://cdn.example.com/og.jpg',
        mime_type: 'image/jpeg',
        created_at: '2026-05-07T00:00:00Z',
      },
    ];
    const resolver = new MediaAssetResolver(
      makeUserClient(rows) as any,
      makeAdminClient() as any
    );
    const result = await resolver.resolveThumbnailsByImport(['imp-1']);
    expect(result.get('imp-1')?.url).toBe('https://cdn.example.com/og.jpg');
  });

  it('returns empty map when the user client query fails (RLS / transport)', async () => {
    const resolver = new MediaAssetResolver(
      makeUserClient([], { failQuery: true }) as any,
      makeAdminClient() as any
    );
    const result = await resolver.resolveThumbnailsByImport(['imp-1']);
    expect(result.size).toBe(0);
  });

  it('returns empty map when the storage signing batch fails', async () => {
    const rows: RowSpec[] = [
      {
        id: 'asset-1',
        import_id: 'imp-1',
        kind: 'thumbnail',
        origin: 'thumbnail_snapshot',
        storage_bucket: 'recipe-media',
        storage_key: 'users/u1/thumbnail/2026/05/og.jpg',
        public_url: null,
        mime_type: 'image/jpeg',
        created_at: '2026-05-07T00:00:00Z',
      },
    ];
    const resolver = new MediaAssetResolver(
      makeUserClient(rows) as any,
      makeAdminClient({ failBatch: true }) as any
    );
    const result = await resolver.resolveThumbnailsByImport(['imp-1']);
    expect(result.size).toBe(0);
  });
});
