import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SettingsNavigation from '../SettingsNavigation';
import type { SettingsSection } from '@/hooks/useSettingsSection';
const renderSection=(section:SettingsSection)=><p>{{ account:'Compte ouvert','assistant-memory':'Souvenirs ouverts',cooking:'Profil ouvert',nutrition:'Nutrition',appearance:'Apparence','data-privacy':'Confidentialité',notifications:'Notifications' }[section]}</p>;
test('settings starts with destinations, opens memory by URL and returns to the list',async()=>{
  render(<MemoryRouter initialEntries={['/settings']}><SettingsNavigation renderSection={renderSection}/></MemoryRouter>);
  expect(screen.queryByText('Compte ouvert')).not.toBeInTheDocument();
  const memory=screen.getByRole('link',{ name:/Mémoire de l’assistant/ });
  expect(memory).toHaveAttribute('href','/settings?section=assistant-memory');
  expect(screen.getByRole('link',{ name:/Profil alimentaire/ })).toHaveAttribute('href','/settings?section=cooking');
  fireEvent.click(memory);
  await waitFor(()=>expect(screen.getByRole('heading',{ name:'Mémoire de l’assistant' })).toHaveFocus());
  expect(screen.getByText('Souvenirs ouverts')).toBeVisible();
  fireEvent.click(screen.getByRole('link',{ name:'Toutes les rubriques' }));
  expect(screen.queryByText('Souvenirs ouverts')).not.toBeInTheDocument();
});
test('a direct profile URL preserves other search parameters',()=>{
  render(<MemoryRouter initialEntries={['/settings?section=cooking&from=recipe']}><SettingsNavigation renderSection={renderSection}/></MemoryRouter>);
  expect(screen.getByText('Profil ouvert')).toBeVisible();
  expect(screen.getByRole('link',{ name:/Mémoire de l’assistant/ })).toHaveAttribute('href','/settings?section=assistant-memory&from=recipe');
});
