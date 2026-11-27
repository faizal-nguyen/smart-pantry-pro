import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { ImageUploadSection } from '../ImageUploadSection';
import { deleteProductPhoto, uploadProductPhoto } from '@/lib/photoUpload';

jest.mock('@/lib/photoUpload', () => ({ uploadProductPhoto: jest.fn(), deleteProductPhoto: jest.fn() }));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));

const URL_STORED = 'https://project.supabase.test/storage/v1/object/public/product-images/product-1.jpg';
const photo = new File(['raw camera bytes'], 'IMG_2041.HEIC', { type: 'image/heic' });

function pick(container: HTMLElement) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [photo] } });
}

beforeEach(() => jest.clearAllMocks());

test('a chosen photo goes through the product upload (re-encoded, random name) and its URL is kept', async () => {
  jest.mocked(uploadProductPhoto).mockResolvedValue(URL_STORED);
  const onChange = jest.fn();
  const { container } = render(<ImageUploadSection onChange={onChange} />);
  pick(container);
  await waitFor(() => expect(onChange).toHaveBeenCalledWith(URL_STORED));
  expect(uploadProductPhoto).toHaveBeenCalledWith(photo);
});

test('a photo that cannot be read or sent says why, and the product is saved without it', async () => {
  jest.mocked(uploadProductPhoto).mockRejectedValue(new Error('Cette photo ne peut pas être lue sur cet appareil.'));
  const onChange = jest.fn();
  const { container } = render(<ImageUploadSection onChange={onChange} />);
  pick(container);
  await waitFor(() => expect(onChange).toHaveBeenCalledWith(undefined));
  expect(toast.error).toHaveBeenCalledWith('Photo non ajoutée', { description: 'Cette photo ne peut pas être lue sur cet appareil.' });
});

test('removing the photo deletes the stored file through its URL', async () => {
  jest.mocked(deleteProductPhoto).mockResolvedValue(undefined);
  const onChange = jest.fn();
  render(<ImageUploadSection value={URL_STORED} onChange={onChange} />);
  fireEvent.click(screen.getByRole('button', { name: 'Retirer la photo' }));
  await waitFor(() => expect(onChange).toHaveBeenCalledWith(undefined));
  expect(deleteProductPhoto).toHaveBeenCalledWith(URL_STORED);
});

test('a photo whose file could not be deleted leaves the product, and the person is told the file stayed', async () => {
  jest.mocked(deleteProductPhoto).mockRejectedValue(new Error('La photo n’a pas pu être supprimée.'));
  const onChange = jest.fn();
  render(<ImageUploadSection value={URL_STORED} onChange={onChange} />);
  fireEvent.click(screen.getByRole('button', { name: 'Retirer la photo' }));
  await waitFor(() => expect(onChange).toHaveBeenCalledWith(undefined));
  expect(toast.error).toHaveBeenCalledWith('Fichier non supprimé', { description: 'La photo n’a pas pu être supprimée.' });
});
