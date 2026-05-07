import {
  canPersistMedia,
  normalizeRightsAttestation,
} from '../MediaRightsPolicy.js';

describe('MediaRightsPolicy', () => {
  it('keeps official embeds as embed-only', () => {
    expect(canPersistMedia({ origin: 'official_embed' })).toEqual({
      allowed: false,
      mode: 'embed_only',
      code: 'EMBED_ONLY',
    });
  });

  it('keeps source links as link-only', () => {
    expect(canPersistMedia({ origin: 'source_link' })).toEqual({
      allowed: false,
      mode: 'link_only',
      code: 'LINK_ONLY',
    });
  });

  it('rejects user uploads without a valid attestation', () => {
    const decision = canPersistMedia({ origin: 'user_upload' });
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe('RIGHTS_ATTESTATION_REQUIRED');
  });

  it('allows personal archive uploads with a valid attestation', () => {
    const attestation = normalizeRightsAttestation({
      accepted: true,
      rightsBasis: 'platform_native_download',
    });
    const decision = canPersistMedia({
      origin: 'personal_archive_upload',
      rightsAttestation: attestation,
    });
    expect(decision).toEqual({ allowed: true, mode: 'store' });
    expect(attestation?.policyVersion).toBeTruthy();
    expect(attestation?.attestedAt).toBeTruthy();
  });

  it('rejects invalid rights bases', () => {
    expect(
      normalizeRightsAttestation({
        accepted: true,
        rightsBasis: 'because_i_want_it',
      })
    ).toBeNull();
  });

  it('allows thumbnail_snapshot without an attestation (PRP §5.13)', () => {
    // Forced at social-capture time to bypass Instagram/TikTok CDN TTL.
    // Attribution stays in `source_url` on the row.
    const decision = canPersistMedia({ origin: 'thumbnail_snapshot' });
    expect(decision).toEqual({ allowed: true, mode: 'store' });
  });
});

