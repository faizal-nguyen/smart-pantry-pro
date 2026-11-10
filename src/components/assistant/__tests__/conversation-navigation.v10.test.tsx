import {fireEvent,render,screen,within} from '@testing-library/react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import AssistantDashboard from '@/pages/assistant/AssistantDashboard';
import {ResponsiveProvider} from '@/contexts/ResponsiveContext';
const mockRetry=jest.fn();
let mockError=false;
const conversations=[{id:'soup',title:'Soupe aux oignons',mode:'general',created_at:'2026-11-09T20:00:00Z',last_message_at:null},
  {id:'tunis',title:'Une recette tunisienne',mode:'recipes',created_at:'2026-11-09T21:00:00Z',last_message_at:null}];
jest.mock('@/hooks/useAuthenticatedUser',()=>({useAuthenticatedUser:()=>({id:'owner'}),useAuthSessionOptional:()=>({user:{id:'owner'}})}));
jest.mock('@/hooks/useFamilyMode',()=>({useAgeAdaptiveUI:()=>({adaptiveInterface:{},getStyleClasses:()=>''})}));
jest.mock('@/hooks/useAssistantConversations',()=>({
  useAssistantConversations:()=>({conversations,isLoading:false,error:null,refetch:jest.fn()}),
  useAssistantMessages:(id:string|null)=>({messages:id ? [{id:id+'-user',conversation_id:id,role:'user',content:id==='soup' ? 'Préparons une soupe aux oignons' : 'Une recette tunisienne avec mon stock',created_at:'2026-11-09T21:00:00Z',action_log_ids:[],metadata:{}},
    {id:id+'-answer',conversation_id:id,role:'assistant',content:id==='soup' ? 'Réponse soupe' : 'Réponse tunisienne',created_at:'2026-11-09T21:00:01Z',action_log_ids:[],metadata:{model_receipt:{calls:[],llm_usd:0.001}}}] : [],isLoading:false,error:mockError ? new Error('Lecture impossible') : null,refetch:mockRetry})
}));
jest.mock('@/hooks/useAssistantHistorySearch',()=>({useAssistantHistorySearch:()=>({matches:[],isLoading:false,debouncedQuery:''})}));
jest.mock('@/services/assistantApi',()=>({archiveAssistantConversation:jest.fn(),patchAssistantConversation:jest.fn(),softDeleteAssistantConversation:jest.fn()}));
jest.mock('../AssistantComposer',()=>({__esModule:true,default:({conversationId}:{conversationId:string|null})=><p>Destination : {conversationId ?? 'nouvelle'}</p>}));
jest.mock('../MemoryPanel',()=>({__esModule:true,default:()=>null}));
jest.mock('../AssistantHistoryNotice',()=>({__esModule:true,default:()=>null}));
jest.mock('../AssistantMemoryNotice',()=>({__esModule:true,default:()=>null}));
jest.mock('../AssistantRecipeProposals',()=>({__esModule:true,default:()=>null}));
jest.mock('../AddChefIdeaDialog',()=>({__esModule:true,default:()=>null}));
jest.mock('@/lib/agentEvents',()=>({dispatchAgentDbChanged:jest.fn(),tablesForTool:()=>[]}));
beforeEach(()=>{mockError=false;mockRetry.mockClear();HTMLElement.prototype.scrollIntoView=jest.fn();});
function mount(){return render(<ResponsiveProvider><QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={['/assistant?conversation=soup']}><Routes><Route path="/assistant" element={<AssistantDashboard/>}/></Routes></MemoryRouter></QueryClientProvider></ResponsiveProvider>);}
test('opening an old conversation closes the history panel, switches both messages and composer, and keeps receipts out of the chat',()=>{
  mount();
  expect(screen.getByText('Réponse soupe')).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Conversations'}));
  const dialog=screen.getByRole('dialog');
  fireEvent.click(within(dialog).getByRole('link',{name:/Une recette tunisienne/}));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByText('Réponse tunisienne')).toBeVisible();
  expect(screen.queryByText('Réponse soupe')).not.toBeInTheDocument();
  expect(screen.getByText('Destination : tunis')).toBeVisible();
  expect(screen.getByRole('link',{name:/Une recette tunisienne/})).toHaveAttribute('aria-current','page');
  expect(screen.queryByText('Modèles et coût de cette réponse')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Nouvelle conversation'}));
  expect(screen.getByText('Destination : nouvelle')).toBeVisible();
  expect(screen.queryByText('Réponse tunisienne')).not.toBeInTheDocument();
});
test('a failed history read offers a retry instead of silently looking like an empty conversation',()=>{
  mockError=true;mount();
  expect(screen.getByRole('alert')).toHaveTextContent('Impossible d’ouvrir');
  fireEvent.click(screen.getByRole('button',{name:'Réessayer l’ouverture'}));
  expect(mockRetry).toHaveBeenCalledTimes(1);
});
