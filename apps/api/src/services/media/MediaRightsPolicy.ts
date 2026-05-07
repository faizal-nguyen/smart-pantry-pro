export type MediaOrigin =
  | 'source_link'
  | 'official_embed'
  // PRP §5.13: at every social capture, the pipeline downloads the OG
  // thumbnail to our storage so we don't depend on the platform CDN's
  // signed-URL TTL. Treated as a legitimate platform-embed-grade
  // preview — attribution preserved through `source_url`.
  | 'thumbnail_snapshot'
  | 'user_upload'
  | 'personal_archive_upload'
  | 'permitted_download'
  | 'generated';

export type RightsBasis =
  | 'created_by_user'
  | 'user_has_permission'
  | 'platform_native_download'
  | 'personal_backup'
  | 'licensed';

export interface RightsAttestation {
  accepted: true;
  rightsBasis: RightsBasis;
  policyVersion?: string;
  attestedAt?: string;
  sourceUrl?: string;
  originalCreator?: string;
  notes?: string;
}

export interface MediaRightsDecision {
  allowed: boolean;
  mode: 'store' | 'embed_only' | 'link_only' | 'blocked';
  code?: string;
  message?: string;
}

export const CURRENT_MEDIA_RIGHTS_POLICY_VERSION =
  process.env.MEDIA_RIGHTS_POLICY_VERSION || '2026-05-07.personal-archive.v1';

const STORE_ALLOWED_ORIGINS = new Set<MediaOrigin>([
  'thumbnail_snapshot',
  'user_upload',
  'personal_archive_upload',
  'permitted_download',
  'generated',
]);

const USER_ATTESTED_ORIGINS = new Set<MediaOrigin>([
  'user_upload',
  'personal_archive_upload',
]);

const RIGHTS_BASES = new Set<RightsBasis>([
  'created_by_user',
  'user_has_permission',
  'platform_native_download',
  'personal_backup',
  'licensed',
]);

export function normalizeRightsAttestation(
  attestation: unknown,
  now: Date = new Date()
): RightsAttestation | null {
  if (!attestation || typeof attestation !== 'object') return null;
  const value = attestation as Partial<RightsAttestation>;
  if (value.accepted !== true) return null;
  if (!value.rightsBasis || !RIGHTS_BASES.has(value.rightsBasis)) return null;

  return {
    accepted: true,
    rightsBasis: value.rightsBasis,
    policyVersion: value.policyVersion || CURRENT_MEDIA_RIGHTS_POLICY_VERSION,
    attestedAt: value.attestedAt || now.toISOString(),
    sourceUrl: value.sourceUrl,
    originalCreator: value.originalCreator,
    notes: value.notes,
  };
}

export function canPersistMedia(input: {
  origin: MediaOrigin;
  rightsAttestation?: RightsAttestation | null;
}): MediaRightsDecision {
  if (input.origin === 'official_embed') {
    return { allowed: false, mode: 'embed_only', code: 'EMBED_ONLY' };
  }

  if (input.origin === 'source_link') {
    return { allowed: false, mode: 'link_only', code: 'LINK_ONLY' };
  }

  if (!STORE_ALLOWED_ORIGINS.has(input.origin)) {
    return {
      allowed: false,
      mode: 'blocked',
      code: 'MEDIA_RIGHTS_BLOCKED',
      message: 'Ce media ne peut pas etre stocke.',
    };
  }

  if (USER_ATTESTED_ORIGINS.has(input.origin) && !input.rightsAttestation) {
    return {
      allowed: false,
      mode: 'blocked',
      code: 'RIGHTS_ATTESTATION_REQUIRED',
      message: 'Confirme la base de droits avant de stocker cette video.',
    };
  }

  return { allowed: true, mode: 'store' };
}

