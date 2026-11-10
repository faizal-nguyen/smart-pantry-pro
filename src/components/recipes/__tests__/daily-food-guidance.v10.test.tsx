import {fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {buildFoodGuidance} from '@smart/shared';
import DailyFoodGuidance from '../DailyFoodGuidance';
import {useFoodGuidance} from '@/hooks/useFoodGuidance';
import {useAskAssistant} from '@/hooks/useAskAssistant';
jest.mock('@/hooks/useFoodGuidance',()=>({useFoodGuidance:jest.fn()}));
jest.mock('@/hooks/useAskAssistant',()=>({useAskAssistant:jest.fn()}));
const now=new Date('2026-11-10T12:00:00Z');
const facts=buildFoodGuidance(['Radis noir','Potimarron','Lentilles','Gingembre','Pollen d’abeilles','Feuilles de séné'].map(name=>({id:name,product_id:name,product_name:name,quantity:1,created_at:now.toISOString()})),{now});
const ask=jest.fn(),refetch=jest.fn();
beforeEach(()=>{jest.clearAllMocks();jest.mocked(useAskAssistant).mockReturnValue(ask);jest.mocked(useFoodGuidance).mockReturnValue({data:facts,isLoading:false,error:null,refetch} as never);});
const mount=()=>render(<MemoryRouter><DailyFoodGuidance now={now}/></MemoryRouter>);
test('daily food, season and individual plants expose sources and offer recipes without writing stock',()=>{
 mount();expect(screen.getByRole('heading',{name:'Mieux manger aujourd’hui'})).toBeInTheDocument();
 expect(screen.getByText(/France métropolitaine/)).toBeInTheDocument();
 fireEvent.click(screen.getByText(/Tes plantes, tisanes et pollen/));
 fireEvent.click(screen.getByText('Pollen d’abeilles'));
 expect(screen.getByRole('link',{name:/ANSES — Pollens/})).toHaveAttribute('href','https://vigilanses.anses.fr/fr/node/1680');
 expect(screen.getByText(/Risque de réaction allergique/)).toBeVisible();
 fireEvent.click(screen.getByText('Feuilles de séné'));
 expect(screen.getByText(/Pas une tisane quotidienne/)).toBeVisible();
 fireEvent.click(screen.getAllByRole('button',{name:/Trouver une recette avec/})[0]);
 expect(ask).toHaveBeenCalledWith(expect.stringContaining('de vrais liens'));
 expect(screen.getByText(/À découvrir, hors de ton stock/)).toBeInTheDocument();
});
test('failed reads can be retried without stale health suggestions',()=>{
 jest.mocked(useFoodGuidance).mockReturnValue({data:facts,isLoading:false,error:new Error('Conseils indisponibles'),refetch} as never);mount();
 expect(screen.getByRole('alert')).toHaveTextContent('Conseils indisponibles');
 expect(screen.queryByText('Gingembre')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Réessayer les conseils'}));expect(refetch).toHaveBeenCalledTimes(1);
});
test('empty stock does not manufacture a drink or an available meal',()=>{
 jest.mocked(useFoodGuidance).mockReturnValue({data:buildFoodGuidance([],{now}),isLoading:false,error:null,refetch} as never);mount();
 expect(screen.getByText(/L’eau reste la boisson de référence/)).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:/Trouver une recette avec/})).not.toBeInTheDocument();
});
