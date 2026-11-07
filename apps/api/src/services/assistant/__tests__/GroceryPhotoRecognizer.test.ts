import { benchmarkConfig } from '../../ai/ModelConfig.js';
import { GroceryPhotoRecognizer, PhotoRecognitionError } from '../GroceryPhotoRecognizer.js';
import type { AICompletionRequest } from '../../imports/RecipeExtractionService.js';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
function recognizer(answer: string | Error) {
  const ai = { complete: jest.fn(async (req: AICompletionRequest) => {
    if (answer instanceof Error) throw answer;
    return { content: answer, model: req.model, usage: { prompt_tokens: 2500, completion_tokens: 300 } };
  }) };
  return { ai, service: new GroceryPhotoRecognizer(ai, benchmarkConfig('baseline')) };
}

test('sends the photos to the vision role and returns a clean French list', async () => {
  const { ai, service } = recognizer(JSON.stringify({ items: [
    { name: ' Lait demi-écrémé ', quantity: 6, unit: 'bouteille', brand: 'Lactel', expiry_date: '2026-11-20', confidence: 'high' },
    { name: 'Pommes', quantity: 0, unit: 'kg', confidence: 'medium' },
    { name: '', quantity: 2 },
    { name: 'Riz', quantity: 1, unit: 'kg', expiry_date: 'bientôt', confidence: 'sure' },
  ] }));
  const result = await service.recognize([{ buffer: JPEG }]);
  expect(result.items).toEqual([
    { name: 'Lait demi-écrémé', quantity: 6, unit: 'bouteille', brand: 'Lactel', expiry_date: '2026-11-20', confidence: 'high' },
    { name: 'Pommes', quantity: null, unit: 'kg', brand: null, expiry_date: null, confidence: 'medium' },
    { name: 'Riz', quantity: 1, unit: 'kg', brand: null, expiry_date: null, confidence: 'low' },
  ]);
  const request = ai.complete.mock.calls[0][0];
  expect(request.model).toBe('gpt-6-luna');
  // Pack names stay in their language; the brand comes apart (« Mayonnaise » + « Kewpie »).
  expect(request.messages[0].content).toContain('Ne le traduis JAMAIS');
  expect(request.messages[1].images).toEqual([{ url: `data:image/jpeg;base64,${JPEG.toString('base64')}`, detail: 'high' }]);
  expect(result.model_receipt.calls[0]).toMatchObject({ role: 'vision', purpose: 'grocery_photo', status: 'completed' });
});

test('refuses no photo, more than 4 photos, or a file that is not an image, before any model call', async () => {
  const { ai, service } = recognizer('{"items":[]}');
  await expect(service.recognize([])).rejects.toMatchObject({ code: 'NO_PHOTO' });
  await expect(service.recognize(Array.from({ length: 5 }, () => ({ buffer: JPEG })))).rejects.toMatchObject({ code: 'TOO_MANY_PHOTOS' });
  await expect(service.recognize([{ buffer: Buffer.from('<html>') }])).rejects.toMatchObject({ code: 'UNSUPPORTED_IMAGE' });
  expect(ai.complete).not.toHaveBeenCalled();
});

test('a provider failure or an unreadable answer is a recognition failure', async () => {
  await expect(recognizer(new Error('AuthenticationError')).service.recognize([{ buffer: JPEG }])).rejects.toBeInstanceOf(PhotoRecognitionError);
  await expect(recognizer('pas du json').service.recognize([{ buffer: JPEG }])).rejects.toMatchObject({ code: 'RECOGNITION_FAILED' });
});
