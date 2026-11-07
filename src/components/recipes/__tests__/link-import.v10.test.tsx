import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { LinkImport } from '../LinkImport';

const capture = jest.fn();
const extract = jest.fn();
const getCurrentDraft = jest.fn();

jest.mock('@/hooks/useSocialRecipeImports', () => ({
  useSocialRecipeImports: () => ({ capture, extract, getCurrentDraft }),
}));

const URL_IG = 'https://www.instagram.com/reel/abc/';
const captured = { id: 'import-1', status: 'captured' };
const draft = { id: 'draft-1', title: 'Pâtes au citron' };

function submit(onVerifyDraft: jest.Mock) {
  render(<LinkImport onVerifyDraft={onVerifyDraft} />);
  fireEvent.change(screen.getByLabelText(/URL à capturer/i), { target: { value: URL_IG } });
  fireEvent.click(screen.getByRole('button', { name: /Capturer/i }));
}

beforeEach(() => {
  capture.mockReset();
  extract.mockReset();
  getCurrentDraft.mockReset();
});

test('captures the link, extracts it, then opens the verification with the draft', async () => {
  capture.mockResolvedValue({ import: captured, duplicate: false });
  extract.mockResolvedValue({ import: { ...captured, status: 'extracted' }, draft });
  const onVerifyDraft = jest.fn();
  submit(onVerifyDraft);
  await waitFor(() => expect(onVerifyDraft).toHaveBeenCalledWith({ import: { ...captured, status: 'extracted' }, draft }));
  expect(capture).toHaveBeenCalledWith(URL_IG);
  expect(extract).toHaveBeenCalledWith('import-1');
});

test('a link already extracted reopens its draft without a new extraction', async () => {
  capture.mockResolvedValue({ import: captured, duplicate: true });
  getCurrentDraft.mockResolvedValue({ import: captured, draft });
  const onVerifyDraft = jest.fn();
  submit(onVerifyDraft);
  await waitFor(() => expect(onVerifyDraft).toHaveBeenCalledWith({ import: captured, draft }));
  expect(extract).not.toHaveBeenCalled();
});

test('a failed extraction says so in French and keeps the link to retry', async () => {
  capture.mockResolvedValue({ import: captured, duplicate: false });
  extract.mockRejectedValue(new Error('Video extraction failed'));
  const onVerifyDraft = jest.fn();
  submit(onVerifyDraft);
  expect(await screen.findByText(/Impossible de lire la recette de ce lien/)).toBeInTheDocument();
  expect(screen.getByText(/À vérifier/)).toBeInTheDocument();
  expect(onVerifyDraft).not.toHaveBeenCalled();
});
