import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import AssistantModelsSection from '../AssistantModelsSection';
let mockOwner:string|null='A';const mockRead=jest.fn();
jest.mock('@/hooks/useAuthenticatedUser',()=>({useAuthSessionOptional:()=>({user:mockOwner ? {id:mockOwner}:null})}));
jest.mock('@/services/assistantApi',()=>({getAssistantModels:(owner:string)=>mockRead(owner)}));
const catalog={configuration_version:'test',preset:'baseline',activation:'baseline',pricing_version:'prices-test',
  roles:[{role:'dialogue',model:'gpt-4o-mini',transport:'chat_completions',effort:null,max_output_tokens:1500,timeout_ms:20000,last_served_model:null,last_verified_at:null,verification:'not_observed'}],
  limits:{max_calls:4,max_tools:6,deadline_ms:45000,max_usd:0.15}};
function mount() {
  const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
  const wrapper=({children}:{children:React.ReactNode})=><QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return render(<AssistantModelsSection/>,{wrapper});
}
beforeEach(()=>{mockOwner='A';mockRead.mockReset();});
test('a failed catalog read is recoverable and never implies a model has been verified',async()=>{
  mockRead.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(catalog);mount();
  expect(await screen.findByRole('alert')).toHaveTextContent('n’a pas pu être lue');
  fireEvent.click(screen.getByRole('button',{name:'Réessayer'}));
  expect(await screen.findByText('gpt-4o-mini')).toBeInTheDocument();
  expect(screen.getByText(/Configuration non vérifiée/)).toBeInTheDocument();expect(mockRead).toHaveBeenCalledTimes(2);
});
test('late owner A data cannot display as owner B configuration',async()=>{
  let finish:(value:typeof catalog)=>void=()=>{};
  mockRead.mockImplementation((owner:string)=>owner==='A' ? new Promise(resolve=>{finish=resolve;}) : Promise.resolve({...catalog,roles:[{...catalog.roles[0],model:'B-model'}]}));
  const view=mount();await waitFor(()=>expect(mockRead).toHaveBeenCalledWith('A'));
  mockOwner='B';view.rerender(<AssistantModelsSection/>);
  expect(await screen.findByText('B-model')).toBeInTheDocument();finish(catalog);
  await waitFor(()=>expect(screen.queryByText('gpt-4o-mini')).not.toBeInTheDocument());
});
test('signing out removes the catalog and prevents a new request',()=>{
  mockOwner=null;mount();expect(screen.getByText(/Connecte-toi/)).toBeInTheDocument();expect(mockRead).not.toHaveBeenCalled();
});
