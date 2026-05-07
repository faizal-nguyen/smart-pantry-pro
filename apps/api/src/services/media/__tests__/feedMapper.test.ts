import { resolveMediaKind } from '../feedMapper.js';

const imp = (id: string, metadata: Record<string, unknown> | null = null) => ({
  id,
  metadata,
});

describe('resolveMediaKind (PRP-220.24 §5.16)', () => {
  it('returns "none" when no media asset and no embed', () => {
    expect(resolveMediaKind(imp('imp-1'), [])).toBe('none');
  });

  it('returns "image" when only a thumbnail snapshot is attached', () => {
    expect(
      resolveMediaKind(imp('imp-1'), [
        { id: 'a', import_id: 'imp-1', kind: 'thumbnail', origin: 'thumbnail_snapshot' },
      ])
    ).toBe('image');
  });

  it('returns "video_embed" when an official embed exists', () => {
    expect(
      resolveMediaKind(imp('imp-1', { embed: { html: '<iframe />' } }), [
        { id: 'a', import_id: 'imp-1', kind: 'thumbnail', origin: 'thumbnail_snapshot' },
      ])
    ).toBe('video_embed');
  });

  it('prefers a user video upload over an embed', () => {
    expect(
      resolveMediaKind(imp('imp-1', { embed: { html: '<iframe />' } }), [
        { id: 'a', import_id: 'imp-1', kind: 'video', origin: 'personal_archive_upload' },
      ])
    ).toBe('video_upload');
  });

  it('ignores assets attached to a different import', () => {
    expect(
      resolveMediaKind(imp('imp-1'), [
        { id: 'a', import_id: 'imp-2', kind: 'thumbnail', origin: 'thumbnail_snapshot' },
      ])
    ).toBe('none');
  });

  it('ignores empty embed.html strings', () => {
    expect(resolveMediaKind(imp('imp-1', { embed: { html: '' } }), [])).toBe('none');
  });
});
