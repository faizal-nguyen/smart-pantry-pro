import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { RecommendationFeedback } from '@smart/shared';
import AfterCookingFeedback from '../AfterCookingFeedback';
import { postRecipeFeedback } from '@/services/recommendationsApi';
const owner='00000000-0000-4000-8000-000000000001',recipe={ id:'30000000-0000-4000-8000-000000000001',source:'recipes_catalog' as const };
let mockPending:RecommendationFeedback|null=null;
jest.mock('@/services/recommendationsApi',()=>({ postRecipeFeedback:jest.fn(),pendingRecipeFeedback:()=>mockPending }));
beforeEach(()=>{ jest.clearAllMocks();mockPending=null; });
test('after cooking the chosen feedback keeps the exact recipe source and account',async()=>{
  jest.mocked(postRecipeFeedback).mockResolvedValue({ id:'confirmed' });
  render(<MemoryRouter><AfterCookingFeedback owner={owner} recipe={recipe}/></MemoryRouter>);
  fireEvent.click(screen.getByRole('button',{ name:'À refaire' }));
  expect(postRecipeFeedback).toHaveBeenCalledWith(owner,{ recipe,feedback:'repeat',event_id:null });
  expect(await screen.findByRole('status')).toHaveTextContent('Ton retour est enregistré');
});
test('a lost feedback response exposes replay and prevents a different feedback',async()=>{
  jest.mocked(postRecipeFeedback).mockImplementationOnce(async()=>{ mockPending={ command_id:'50000000-0000-4000-8000-000000000001',recipe,feedback:'too_long',event_id:null };throw new Error('Retour non confirmé.'); }).mockImplementationOnce(async()=>{ mockPending=null;return { id:'confirmed' }; });
  render(<MemoryRouter><AfterCookingFeedback owner={owner} recipe={recipe}/></MemoryRouter>);
  fireEvent.click(screen.getByRole('button',{ name:'Trop long' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Retour non confirmé.');
  expect(screen.getByRole('button',{ name:'À refaire' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{ name:'Vérifier le retour conservé' }));
  expect(postRecipeFeedback).toHaveBeenLastCalledWith(owner,{ recipe,feedback:'too_long',event_id:null });
  expect(await screen.findByText(/Ton retour est enregistré/)).toBeVisible();
});
