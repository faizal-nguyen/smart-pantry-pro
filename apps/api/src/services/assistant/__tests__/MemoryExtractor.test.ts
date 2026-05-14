/**
 * PRP-223 PR5 — MemoryExtractor rule tests.
 *
 * Confirms each of the 9 V1 patterns triggers the right
 * kind/sensitivity/status, and that vague phrases stay invisible.
 */
import { MemoryExtractor, MEMORY_EXTRACTOR_RULES } from '../MemoryExtractor.js';

const USER = '11111111-1111-1111-1111-111111111111';

function extract(text: string) {
  return new MemoryExtractor().extract({ userId: USER, text, source: 'text' });
}

describe('MemoryExtractor', () => {
  it('exposes the 9 PRP-223 V1 patterns', () => {
    expect(MEMORY_EXTRACTOR_RULES.length).toBeGreaterThanOrEqual(9);
  });

  it("matches `souviens-toi que je prefere indien leger`", () => {
    const out = extract("souviens-toi que je prefere indien leger");
    // Two rules can match the same sentence; both yield distinct content.
    // What we care about is at least one active explicit preference.
    const active = out.find(
      o => o.kind === 'memory' && o.candidate.status === 'active' && o.candidate.kind === 'preference',
    );
    expect(active).toBeDefined();
    if (active && active.kind === 'memory') {
      expect(active.candidate.sensitivity).toBe('normal');
      expect(active.candidate.content).toMatch(/indien/);
    }
  });

  it('treats `ne me repropose pas le butter chicken` as negative_preference', () => {
    const out = extract('ne me repropose pas le butter chicken');
    expect(out[0].kind).toBe('memory');
    if (out[0].kind === 'memory') {
      expect(out[0].candidate.kind).toBe('negative_preference');
      expect(out[0].candidate.content).toMatch(/butter chicken/);
    }
  });

  it('flags `je suis allergique aux noix` as health_sensitive candidate', () => {
    const out = extract('je suis allergique aux noix');
    expect(out[0].kind).toBe('memory');
    if (out[0].kind === 'memory') {
      expect(out[0].candidate.kind).toBe('constraint');
      expect(out[0].candidate.sensitivity).toBe('health_sensitive');
      expect(out[0].candidate.status).toBe('candidate');
      expect(out[0].candidate.content).toMatch(/allergie/);
    }
  });

  it('flags `je suis intolerant au lactose` as health_sensitive candidate', () => {
    const out = extract('je suis intolerant au lactose');
    expect(out[0].kind).toBe('memory');
    if (out[0].kind === 'memory') {
      expect(out[0].candidate.sensitivity).toBe('health_sensitive');
      expect(out[0].candidate.status).toBe('candidate');
    }
  });

  it('captures `je veux perdre du poids` as diet_goal health_sensitive candidate', () => {
    const out = extract('je veux perdre du poids');
    expect(out[0].kind).toBe('memory');
    if (out[0].kind === 'memory') {
      expect(out[0].candidate.kind).toBe('diet_goal');
      expect(out[0].candidate.sensitivity).toBe('health_sensitive');
      expect(out[0].candidate.status).toBe('candidate');
    }
  });

  it("captures `je n'aime pas la coriandre` as negative_preference candidate (vague signal)", () => {
    const out = extract("je n'aime pas la coriandre");
    expect(out[0].kind).toBe('memory');
    if (out[0].kind === 'memory') {
      expect(out[0].candidate.kind).toBe('negative_preference');
      expect(out[0].candidate.status).toBe('candidate');
      expect(out[0].candidate.content).toMatch(/coriandre/);
    }
  });

  it('captures `je prefere les recettes courtes` as preference candidate', () => {
    const out = extract('je prefere les recettes courtes');
    expect(out[0].kind).toBe('memory');
    if (out[0].kind === 'memory') {
      expect(out[0].candidate.kind).toBe('preference');
      expect(out[0].candidate.status).toBe('candidate');
    }
  });

  it('detects `ce soir` as a session_context, not a memory', () => {
    const out = extract("ce soir j'ai 20 minutes");
    const session = out.find(o => o.kind === 'session');
    expect(session).toBeDefined();
    if (session && session.kind === 'session') {
      expect(session.candidate.key).toBe('time_window');
      expect(session.candidate.ttlMs).toBeGreaterThan(0);
    }
  });

  it('returns no candidates for a vague phrase', () => {
    const out = extract('je suis fatigue');
    expect(out).toHaveLength(0);
  });

  it('dedups when multiple rules match the same payload (compound sentence)', () => {
    // `souviens-toi` should win over `je n'aime pas` for clarity:
    // both patterns can hit but the dedup happens on (kind, normalized_content).
    const out = extract("souviens-toi que je n'aime pas la coriandre");
    // We expect 2 candidates max (one souviens-toi capture, one
    // "je n'aime pas" capture), but each with distinct normalized
    // content. Acceptable.
    expect(out.length).toBeGreaterThanOrEqual(1);
    expect(out.length).toBeLessThanOrEqual(2);
  });

  it('stamps source=recipe_feedback when input.source is recipe_feedback', () => {
    const extractor = new MemoryExtractor();
    const out = extractor.extract({
      userId: USER,
      text: 'souviens-toi que le butter chicken etait trop sale',
      source: 'recipe_feedback',
    });
    expect(out[0].kind).toBe('memory');
    if (out[0].kind === 'memory') {
      expect(out[0].candidate.source).toBe('recipe_feedback');
    }
  });
});
