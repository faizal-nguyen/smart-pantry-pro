import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CaptureUrlBar } from '../CaptureUrlBar';

describe('CaptureUrlBar', () => {
  it('rejects garbage input client-side and never calls onCapture', async () => {
    const user = userEvent.setup();
    const onCapture = jest.fn();
    render(<CaptureUrlBar onCapture={onCapture} />);

    await user.type(screen.getByLabelText(/URL/), 'not a url');
    await user.click(screen.getByRole('button', { name: /Capturer/ }));

    expect(onCapture).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/ne semble pas valide/);
  });

  it('submits a valid URL and clears the input on success', async () => {
    const user = userEvent.setup();
    const onCapture = jest.fn().mockResolvedValue({ duplicate: false });
    render(<CaptureUrlBar onCapture={onCapture} />);

    const input = screen.getByLabelText(/URL/) as HTMLInputElement;
    await user.type(input, 'https://www.instagram.com/reel/abc/');
    await user.click(screen.getByRole('button', { name: /Capturer/ }));

    await waitFor(() => {
      expect(onCapture).toHaveBeenCalledWith('https://www.instagram.com/reel/abc/');
    });
    await waitFor(() => expect(input.value).toBe(''));
  });

  it('prefixes a bare host with https://', async () => {
    const user = userEvent.setup();
    const onCapture = jest.fn().mockResolvedValue({ duplicate: false });
    render(<CaptureUrlBar onCapture={onCapture} />);

    await user.type(screen.getByLabelText(/URL/), 'instagram.com/reel/abc');
    await user.click(screen.getByRole('button', { name: /Capturer/ }));

    await waitFor(() => {
      expect(onCapture).toHaveBeenCalledWith('https://instagram.com/reel/abc');
    });
  });

  it('surfaces server errors as an inline alert', async () => {
    const user = userEvent.setup();
    const onCapture = jest.fn().mockRejectedValue(new Error('quota exceeded'));
    render(<CaptureUrlBar onCapture={onCapture} />);

    await user.type(screen.getByLabelText(/URL/), 'https://www.tiktok.com/@x/video/1');
    await user.click(screen.getByRole('button', { name: /Capturer/ }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/quota exceeded/);
    });
  });
});
