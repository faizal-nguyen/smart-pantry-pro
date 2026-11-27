import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigationType } from 'react-router-dom';
import SettingsNavigation from '../SettingsNavigation';
import type { SettingsSection } from '@/hooks/useSettingsSection';
const opened:Record<string,string>={ account:'Compte ouvert','assistant-memory':'Souvenirs ouverts','assistant-models':'Modèles ouverts',cooking:'Profil ouvert',appearance:'Apparence','data-privacy':'Confidentialité',notifications:'Notifications' };
const renderSection=(section:SettingsSection)=><p>{opened[section] ?? `Rubrique inattendue : ${section}`}</p>;
/** Shows how the router reached the current address, and which address it is. */
function LocationProbe() {
  const location=useLocation(),type=useNavigationType();
  return <output data-testid="location">{`${type} ${location.search}`}</output>;
}
test('settings starts with destinations, opens memory by URL and returns to the list',async()=>{
  render(<MemoryRouter initialEntries={['/settings']}><SettingsNavigation renderSection={renderSection}/></MemoryRouter>);
  expect(screen.queryByText('Compte ouvert')).not.toBeInTheDocument();
  const memory=screen.getByRole('link',{ name:/Mémoire de l’assistant/ });
  expect(memory).toHaveAttribute('href','/settings?section=assistant-memory');
  expect(screen.getByRole('link',{ name:/Profil alimentaire/ })).toHaveAttribute('href','/settings?section=cooking');
  expect(screen.getByRole('link',{ name:/Modèles de l’assistant/ })).toHaveAttribute('href','/settings?section=assistant-models');
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
test('the former nutrition section opens the dietary profile and rewrites its address in place',async()=>{
  render(<MemoryRouter initialEntries={['/settings?section=nutrition&from=recipe']}><SettingsNavigation renderSection={renderSection}/><LocationProbe/></MemoryRouter>);
  expect(screen.getByText('Profil ouvert')).toBeVisible();
  await waitFor(()=>expect(screen.getByTestId('location')).toHaveTextContent('REPLACE ?section=cooking&from=recipe'));
  expect(screen.getByRole('link',{ name:/Profil alimentaire/ })).toHaveAttribute('aria-current','page');
  expect(screen.getByRole('heading',{ name:'Profil alimentaire' })).toHaveFocus();
});
test('the list offers seven destinations, the dietary profile covering goals',()=>{
  render(<MemoryRouter initialEntries={['/settings']}><SettingsNavigation renderSection={renderSection}/></MemoryRouter>);
  expect(within(screen.getByRole('navigation',{ name:'Rubriques des paramètres' })).getAllByRole('link')).toHaveLength(7);
  expect(screen.queryByText('Nutrition et bien-être')).not.toBeInTheDocument();
  expect(screen.getByRole('link',{ name:/Profil alimentaire/ })).toHaveTextContent('Goûts, contraintes, objectifs, temps et portions');
});
test.each(['inconnue','','toString','__proto__','Nutrition'])('the section « %s » shows the list, without opening one or rewriting the address',async(value)=>{
  const search=`?section=${encodeURIComponent(value)}`;
  render(<MemoryRouter initialEntries={[`/settings${search}`]}><SettingsNavigation renderSection={renderSection}/><LocationProbe/></MemoryRouter>);
  expect(screen.getByRole('heading',{ name:'Tes préférences' })).toBeInTheDocument();
  expect(screen.queryByText(/ouvert|Rubrique inattendue/)).not.toBeInTheDocument();
  await new Promise(resolve=>setTimeout(resolve,0));
  expect(screen.getByTestId('location')).toHaveTextContent(`POP ${search}`);
});
test('with two section parameters, the first one decides, as the router reads it',()=>{
  render(<MemoryRouter initialEntries={['/settings?section=data-privacy&section=nutrition']}><SettingsNavigation renderSection={renderSection}/><LocationProbe/></MemoryRouter>);
  expect(screen.getByText('Confidentialité')).toBeVisible();
  expect(screen.getByTestId('location')).toHaveTextContent('POP ?section=data-privacy&section=nutrition');
});
