import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { BulkImportButton } from '../BulkImportButton';

const bulkCaptureMock = jest.fn();

jest.mock('@/hooks/useSocialRecipeImports', () => ({
  useSocialRecipeImports: () => ({
    bulkCapture: bulkCaptureMock,
    capture: jest.fn(),
  }),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

beforeEach(() => {
  bulkCaptureMock.mockReset();
});

function openDialog() {
  fireEvent.click(screen.getByRole('button', { name: /Import bulk/i }));
}

describe('BulkImportButton (PRP-220.18)', () => {
  it('extracts URLs from the textarea and counts them', () => {
    render(<BulkImportButton />);
    openDialog();

    const textarea = screen.getByLabelText(/Liens à importer/i);
    fireEvent.change(textarea, {
      target: {
        value:
          'voici quelques liens https://www.instagram.com/reel/a/ et\n' +
          'https://www.tiktok.com/@x/video/1\n' +
          'doublon: https://www.instagram.com/reel/a/',
      },
    });

    // Dedup -> 2 detected
    expect(screen.getByText(/2 URLs détectées/i)).toBeInTheDocument();
  });

  it('calls bulkCapture with the deduped URLs on submit', async () => {
    bulkCaptureMock.mockResolvedValueOnce({
      results: [{ url: 'https://x' }, { url: 'https://y' }],
    });
    render(<BulkImportButton />);
    openDialog();

    fireEvent.change(screen.getByLabelText(/Liens à importer/i), {
      target: { value: 'https://www.instagram.com/reel/a/\nhttps://youtu.be/abc' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Importer$/i }));

    await waitFor(() => expect(bulkCaptureMock).toHaveBeenCalledTimes(1));
    expect(bulkCaptureMock).toHaveBeenCalledWith([
      'https://www.instagram.com/reel/a/',
      'https://youtu.be/abc',
    ]);
  });

  it('disables the submit button when no URLs are detected', () => {
    render(<BulkImportButton />);
    openDialog();
    const submit = screen.getByRole('button', { name: /^Importer$/i });
    expect(submit).toBeDisabled();
  });

  it('blocks submission and shows an error count when over the 50-URL ceiling', () => {
    render(<BulkImportButton />);
    openDialog();
    // 51 unique URLs.
    const urls = Array.from({ length: 51 }, (_, i) => `https://example.com/p${i}`).join('\n');
    fireEvent.change(screen.getByLabelText(/Liens à importer/i), {
      target: { value: urls },
    });
    expect(screen.getByText(/51.*max 50/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Importer$/i })).toBeDisabled();
    expect(bulkCaptureMock).not.toHaveBeenCalled();
  });
});
