import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useTheme } from '../useTheme';

function Probe({ label }: { label: string }) {
  const { theme, toggleTheme } = useTheme();
  return <button onClick={toggleTheme}>{label}: {theme}</button>;
}
test('one toggle updates the shell, Material theme and notification consumers together', async () => {
  localStorage.setItem('theme','light');
  render(<><Probe label="Shell"/><Probe label="Material"/><Probe label="Notifications"/></>);
  fireEvent.click(screen.getByRole('button',{ name: 'Shell: light' }));
  await screen.findByRole('button',{ name: 'Material: dark' });
  expect(screen.getByRole('button',{ name: 'Notifications: dark' })).toBeInTheDocument();
  expect(document.documentElement).toHaveClass('dark');
  expect(localStorage.getItem('theme')).toBe('dark');
  fireEvent.click(screen.getByRole('button',{ name: 'Notifications: dark' }));
  await waitFor(() => expect(screen.getByRole('button',{ name: 'Shell: light' })).toBeInTheDocument());
  expect(document.documentElement).not.toHaveClass('dark');
});
