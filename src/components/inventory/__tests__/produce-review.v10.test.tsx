import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import ProduceReviewPanel from '../ProduceReviewPanel';
const item={id:'tomato',product_id:'p',quantity:3,unit:'pièce',updated_at:'2026-11-01T12:00:00Z',product:{id:'p',name:'Tomates',category:'Légumes',unit_type:'pièce'}};
test('review actions are explicit; failed writes stay visible and no expiry is invented',async()=>{
 const onKeep=jest.fn(async()=>{throw new Error('Stock changé.');}),onConsumed=jest.fn(async()=>undefined),onCorrect=jest.fn(),onDiscard=jest.fn();
 render(<ProduceReviewPanel items={[item]} now={new Date('2026-11-20T12:00:00Z')} disabled={false} {...{onKeep,onConsumed,onCorrect,onDiscard}}/>);
 expect(screen.getByText(/Ce rappel ne signifie pas/)).toBeVisible();expect(onConsumed).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'J’en ai encore : Tomates'}));await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Stock changé.'));
 expect(screen.getByText('Tomates')).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'Tout consommé : Tomates'}));await waitFor(()=>expect(onConsumed).toHaveBeenCalledWith(item));
});
