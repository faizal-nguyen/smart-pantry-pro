import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useTheme } from '../useTheme';

function Probe({ label }: { label: string }) {
  const { theme, toggleTheme } = useTheme();
  return <button onClick={toggleTheme}>{label}: {theme}</button>;
}
afterEach(()=>jest.restoreAllMocks());
test('a first visit starts light even when the device prefers dark',()=>{
  localStorage.removeItem('theme');
  const media=window.matchMedia('(prefers-color-scheme: dark)');
  jest.spyOn(window,'matchMedia').mockReturnValue({...media,matches:true});
  render(<Probe label="Shell"/>);
  expect(screen.getByRole('button',{name:'Shell: light'})).toBeInTheDocument();
  expect(document.documentElement).not.toHaveClass('dark');
});
test('an explicit saved dark preference survives a new visit',()=>{
  localStorage.setItem('theme','dark');
  render(<Probe label="Shell"/>);
  expect(screen.getByRole('button',{name:'Shell: dark'})).toBeInTheDocument();
  expect(document.documentElement).toHaveClass('dark');
});
test('one toggle updates the shell, pages and notification consumers together', async () => {
  localStorage.setItem('theme','light');
  render(<><Probe label="Shell"/><Probe label="Page"/><Probe label="Notifications"/></>);
  fireEvent.click(screen.getByRole('button',{ name: 'Shell: light' }));
  await screen.findByRole('button',{ name: 'Page: dark' });
  expect(screen.getByRole('button',{ name: 'Notifications: dark' })).toBeInTheDocument();
  expect(document.documentElement).toHaveClass('dark');
  expect(localStorage.getItem('theme')).toBe('dark');
  fireEvent.click(screen.getByRole('button',{ name: 'Notifications: dark' }));
  await waitFor(() => expect(screen.getByRole('button',{ name: 'Shell: light' })).toBeInTheDocument());
  expect(document.documentElement).not.toHaveClass('dark');
});
test('the browser bar follows the chosen theme (V11-06 E3: no other layer overrides it any more)', async () => {
  const meta = document.createElement('meta');
  meta.setAttribute('name', 'theme-color');
  meta.setAttribute('content', '#965229');
  document.head.appendChild(meta);
  try {
    localStorage.setItem('theme','light');
    render(<Probe label="Shell"/>);
    expect(meta).toHaveAttribute('content', '#f8f5ef');
    fireEvent.click(screen.getByRole('button',{ name: 'Shell: light' }));
    await waitFor(() => expect(meta).toHaveAttribute('content', '#1a1a1a'));
  } finally {
    meta.remove();
  }
});
