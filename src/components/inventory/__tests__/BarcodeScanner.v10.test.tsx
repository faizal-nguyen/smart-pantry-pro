import { render, waitFor } from '@testing-library/react';
import BarcodeScanner from '../BarcodeScanner';

type DecodeCallback = (result: { getText: () => string } | undefined, err?: { name: string }) => void;
const mockDecodeFromStream = jest.fn<Promise<void>, [MediaStream, HTMLVideoElement, DecodeCallback]>(async () => undefined);
jest.mock('@zxing/library', () => ({
  BrowserMultiFormatReader: jest.fn().mockImplementation(() => ({ decodeFromStream: mockDecodeFromStream, reset: jest.fn() })),
}));

// Safari 16 shape: no Permissions API for 'camera', no getCapabilities.
const track = { stop: jest.fn() };
const stream = { getVideoTracks: () => [track], getTracks: () => [track] } as unknown as MediaStream;
const getUserMedia = jest.fn(async () => stream);
beforeAll(() => {
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
});
beforeEach(() => jest.clearAllMocks());

test('decodes the single opened stream and reports to the latest handlers', async () => {
  const firstScan = jest.fn(), latestScan = jest.fn(), latestClose = jest.fn();
  const view = render(<BarcodeScanner isOpen onClose={jest.fn()} onScan={firstScan} />);
  await waitFor(() => expect(mockDecodeFromStream).toHaveBeenCalledTimes(1));
  expect(getUserMedia).toHaveBeenCalledTimes(1);
  expect(mockDecodeFromStream.mock.calls[0][0]).toBe(stream);

  view.rerender(<BarcodeScanner isOpen onClose={latestClose} onScan={latestScan} />);
  mockDecodeFromStream.mock.calls[0][2]({ getText: () => '3017620422003' });

  expect(firstScan).not.toHaveBeenCalled();
  expect(latestScan).toHaveBeenCalledWith('3017620422003');
  expect(latestClose).toHaveBeenCalledTimes(1);
  expect(track.stop).toHaveBeenCalled();
});
