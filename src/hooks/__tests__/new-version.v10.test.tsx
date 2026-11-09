import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { useNewVersion } from '../useNewVersion';
import { fetchDeployedBuild } from '@/lib/appVersion';
import NewVersionBanner from '@/components/layout/NewVersionBanner';

// iPhone 2026-11-08: the app, kept in memory, showed the build before #95 until it was killed.
describe('a new deploy is noticed', () => {
  test('a different deployed build makes it available; the same build does not', async () => {
    const fetchBuild = jest.fn().mockResolvedValue('b2');
    const { result } = renderHook(() => useNewVersion({ current: 'b1', fetchBuild }));
    await waitFor(() => expect(result.current).toBe(true));
    const same = renderHook(() => useNewVersion({ current: 'b2', fetchBuild: jest.fn().mockResolvedValue('b2') }));
    await act(async () => { await Promise.resolve(); });
    expect(same.result.current).toBe(false);
  });
  test('coming back to the app checks again, at most once a minute', async () => {
    let now = 1_000_000;
    const spy = jest.spyOn(Date, 'now').mockImplementation(() => now);
    const fetchBuild = jest.fn().mockResolvedValueOnce('b1').mockResolvedValue('b2');
    const { result } = renderHook(() => useNewVersion({ current: 'b1', fetchBuild }));
    await act(async () => { await Promise.resolve(); });
    expect(result.current).toBe(false);
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(fetchBuild).toHaveBeenCalledTimes(1);
    now += 61_000;
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); await Promise.resolve(); });
    await waitFor(() => expect(result.current).toBe(true));
    expect(fetchBuild).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });
  test('without a build id (tests, dev) nothing is fetched', () => {
    const fetchBuild = jest.fn();
    renderHook(() => useNewVersion({ current: '', fetchBuild }));
    expect(fetchBuild).not.toHaveBeenCalled();
  });
  test('the deployed build is read without cache, and a failure is not a new version', async () => {
    const fetcher = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ build: 'b9' }) })
      .mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    await expect(fetchDeployedBuild(fetcher as unknown as typeof fetch)).resolves.toBe('b9');
    expect(fetcher.mock.calls[0][1]).toMatchObject({ cache: 'no-store' });
    await expect(fetchDeployedBuild(fetcher as unknown as typeof fetch)).resolves.toBeNull();
    await expect(fetchDeployedBuild(fetcher as unknown as typeof fetch)).resolves.toBeNull();
  });
});

describe('the banner', () => {
  test('offers to update, and can wait', () => {
    const reload = jest.fn();
    render(<NewVersionBanner available onReload={reload} />);
    expect(screen.getByRole('status')).toHaveTextContent('Une nouvelle version de l’app est disponible.');
    fireEvent.click(screen.getByRole('button', { name: 'Mettre à jour' }));
    expect(reload).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Plus tard' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
  test('shows nothing while the app is current', () => {
    render(<NewVersionBanner available={false} onReload={jest.fn()} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
