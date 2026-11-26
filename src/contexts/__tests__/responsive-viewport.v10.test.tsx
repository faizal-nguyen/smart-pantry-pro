import { act, render } from '@testing-library/react';
import { ResponsiveProvider } from '@/contexts/ResponsiveContext';

type Listener = () => void;
const listeners = new Map<string, Listener>();
const viewport = {
  height: 500,
  offsetTop: 0,
  addEventListener: jest.fn((type: string, listener: Listener) => { listeners.set(type, listener); }),
  removeEventListener: jest.fn((type: string) => { listeners.delete(type); }),
};
const offset = () => document.documentElement.style.getPropertyValue('--routine-viewport-offset');

beforeAll(() => {
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
});
afterAll(() => {
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined });
});
beforeEach(() => {
  listeners.clear();
  viewport.offsetTop = 0;
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { callback(0); return 1; });
});
afterEach(() => { jest.restoreAllMocks(); });

describe('ResponsiveProvider — zone visible au-dessus du clavier (V11-06 E2b)', () => {
  it('follows the visual viewport when it scrolls with the keyboard open (iOS)', () => {
    const view = render(<ResponsiveProvider><p>Accueil</p></ResponsiveProvider>);
    expect(offset()).toBe('0px');

    viewport.offsetTop = 120;
    act(() => { listeners.get('scroll')?.(); });
    expect(offset()).toBe('120px');

    view.unmount();
    expect(listeners.has('scroll')).toBe(false);
  });
});
