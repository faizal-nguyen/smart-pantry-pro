/**
 * Mocks AudioExtractor (avoid spawning ffmpeg) and the Whisper / AI
 * clients. We exercise the orchestration logic, the user-prompt
 * shaping, and the confidence-scoring branches.
 */
import { VideoRecipeExtractor } from '../VideoRecipeExtractor.js';

jest.mock('../AudioExtractor.js', () => ({
  extractAudioFromVideoBuffer: jest.fn(async () => ({
    audioPath: '/tmp/fake-audio.mp3',
    byteSize: 1024,
    cleanup: jest.fn(async () => undefined),
  })),
}));

const { extractAudioFromVideoBuffer } = jest.requireMock('../AudioExtractor.js');

const VALID_DRAFT_JSON = {
  title: 'Restaurant-Style Butter Chicken at Home',
  ingredients: [
    { name: 'poulet', quantity: 500, unit: 'g' },
    { name: 'beurre', quantity: 50, unit: 'g' },
    { name: 'tomate', quantity: 4 },
    { name: 'creme', quantity: 200, unit: 'ml' },
  ],
  instructions: [
    { step: 1, description: 'Mariner le poulet 30 min.' },
    { step: 2, description: 'Faire dorer dans le beurre.' },
    { step: 3, description: 'Ajouter la sauce tomate puis la creme.' },
  ],
  prepTimeMinutes: 30,
  cookTimeMinutes: 25,
  servings: 4,
  tags: ['indien', 'curry'],
  cuisineCategory: 'indienne',
};

function makeAi(content: unknown, usage = { prompt_tokens: 800, completion_tokens: 400 }) {
  return {
    complete: jest.fn(async () => ({
      content: typeof content === 'string' ? content : JSON.stringify(content),
      model: 'gpt-4o-mini',
      usage,
    })),
  };
}

function makeWhisper(text: string, language = 'en') {
  return {
    transcribe: jest.fn(async () => ({
      text,
      language,
      durationSeconds: 87,
    })),
  };
}

const VIDEO_BUFFER = Buffer.from('fake-video-bytes');

describe('VideoRecipeExtractor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('chains audio extract → whisper → AI → validated draft (happy path)', async () => {
    const ai = makeAi(VALID_DRAFT_JSON);
    const whisper = makeWhisper(
      'Tonight we are making butter chicken. Marinate 500g chicken with yogurt, then sear in butter, add tomato sauce and cream.'
    );
    const extractor = new VideoRecipeExtractor(ai as any, whisper as any);

    const result = await extractor.extract({
      videoBuffer: VIDEO_BUFFER,
      videoExtension: 'mp4',
      filename: 'butter-chicken.mp4',
      durationSeconds: 87,
    });

    expect(extractAudioFromVideoBuffer).toHaveBeenCalledWith(
      VIDEO_BUFFER,
      'mp4',
      undefined
    );
    expect(whisper.transcribe).toHaveBeenCalledWith({
      audioPath: '/tmp/fake-audio.mp3',
      language: undefined,
    });
    expect(result.draft.title).toBe('Restaurant-Style Butter Chicken at Home');
    expect(result.draft.ingredients).toHaveLength(4);
    expect(result.draft.instructions).toHaveLength(3);
    expect(result.draft.source.platform).toBe('manual');
    expect(result.draft.source.extractionMethod).toBe('transcript');
    expect(result.transcript).toContain('butter chicken');
    expect(result.detectedLanguage).toBe('en');
    // 87s × $0.006/60 = $0.0087
    expect(result.cost.whisperUsd).toBeCloseTo(0.0087, 4);
    // 800 × 0.15/M + 400 × 0.6/M = 0.00012 + 0.00024 = 0.00036
    expect(result.cost.llmUsd).toBeCloseTo(0.00036, 4);
    expect(result.cost.totalUsd).toBeGreaterThan(0);
    expect(result.draft.confidence).toBeGreaterThan(0.7);
  });

  it('passes the language hint through to Whisper', async () => {
    const ai = makeAi(VALID_DRAFT_JSON);
    const whisper = makeWhisper('…', 'fr');
    const extractor = new VideoRecipeExtractor(ai as any, whisper as any);

    await extractor.extract({
      videoBuffer: VIDEO_BUFFER,
      videoExtension: 'mp4',
      filename: 'foo.mp4',
      durationSeconds: 30,
      language: 'fr',
    });

    expect(whisper.transcribe).toHaveBeenCalledWith({
      audioPath: '/tmp/fake-audio.mp3',
      language: 'fr',
    });
  });

  it('feeds filename + caption + transcript into the AI prompt', async () => {
    const ai = makeAi(VALID_DRAFT_JSON);
    const whisper = makeWhisper('a long transcript here…');
    const extractor = new VideoRecipeExtractor(ai as any, whisper as any);

    await extractor.extract({
      videoBuffer: VIDEO_BUFFER,
      videoExtension: 'mp4',
      filename: 'butter-chicken-v2.mp4',
      durationSeconds: 87,
      caption: 'My grandma\'s butter chicken — restaurant style at home',
      sourceUrl: 'https://www.instagram.com/reel/abc',
    });

    const userMessage = (ai.complete as jest.Mock).mock.calls[0][0].messages[1].content;
    expect(userMessage).toContain('butter-chicken-v2.mp4');
    expect(userMessage).toContain('My grandma');
    expect(userMessage).toContain('a long transcript');
    expect(userMessage).toContain('https://www.instagram.com/reel/abc');
  });

  it('falls back to filename-as-title when AI returns an empty title', async () => {
    const ai = makeAi({ title: '', ingredients: [], instructions: [], tags: [] });
    const whisper = makeWhisper('');
    const extractor = new VideoRecipeExtractor(ai as any, whisper as any);

    const result = await extractor.extract({
      videoBuffer: VIDEO_BUFFER,
      videoExtension: 'mp4',
      filename: 'My_Butter-Chicken_Recipe.mp4',
      durationSeconds: 30,
    });

    expect(result.draft.title).toBe('My Butter Chicken Recipe');
  });

  it('flags low-signal extracts in extractionWarnings + drops confidence', async () => {
    const ai = makeAi({
      title: 'Mystery dish',
      ingredients: [],
      instructions: [],
      tags: [],
    });
    const whisper = makeWhisper(''); // no audio
    const extractor = new VideoRecipeExtractor(ai as any, whisper as any);

    const result = await extractor.extract({
      videoBuffer: VIDEO_BUFFER,
      videoExtension: 'mp4',
      filename: 'foo.mp4',
      durationSeconds: 30,
    });

    expect(result.draft.extractionWarnings).toEqual(
      expect.arrayContaining([
        'Aucun ingredient detecte',
        'Aucune etape detectee',
        'Aucune narration audio detectee — extraction limitee',
      ])
    );
    expect(result.draft.confidence).toBeLessThan(0.3);
  });

  it('cleans up the extracted audio even when Whisper throws', async () => {
    const cleanupSpy = jest.fn(async () => undefined);
    (extractAudioFromVideoBuffer as jest.Mock).mockResolvedValueOnce({
      audioPath: '/tmp/fake-audio.mp3',
      byteSize: 1024,
      cleanup: cleanupSpy,
    });
    const ai = makeAi(VALID_DRAFT_JSON);
    const whisper = {
      transcribe: jest.fn(async () => {
        throw new Error('Whisper down');
      }),
    };
    const extractor = new VideoRecipeExtractor(ai as any, whisper as any);

    await expect(
      extractor.extract({
        videoBuffer: VIDEO_BUFFER,
        videoExtension: 'mp4',
        filename: 'foo.mp4',
        durationSeconds: 30,
      })
    ).rejects.toThrow('Whisper down');

    expect(cleanupSpy).toHaveBeenCalled();
  });

  it('throws a clear error when the AI returns non-JSON content', async () => {
    const ai = makeAi('this is not json');
    const whisper = makeWhisper('valid transcript');
    const extractor = new VideoRecipeExtractor(ai as any, whisper as any);

    await expect(
      extractor.extract({
        videoBuffer: VIDEO_BUFFER,
        videoExtension: 'mp4',
        filename: 'foo.mp4',
        durationSeconds: 30,
      })
    ).rejects.toThrow(/non-JSON content/);
  });
});
