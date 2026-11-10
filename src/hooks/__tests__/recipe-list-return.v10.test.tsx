import {render,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {useRecipeListReturn} from '../useRecipeListReturn';
const next=jest.fn();
function Harness({loaded}:{loaded:boolean}){
 useRecipeListReturn({owner:'owner',ready:true,renderedKey:loaded?'saved-card':'',pages:1,hasNext:false,fetching:false,fetchNext:next});
 return loaded?<div id="saved-card"><a href="#">La recette</a></div>:null;
}
afterEach(()=>{sessionStorage.clear();jest.restoreAllMocks();});
test('restoration waits for asynchronous rows even if loading and page count already settled',async()=>{
 sessionStorage.setItem('recipe-list-return:owner',JSON.stringify({url:'/kitchen/recipes?cuisine=francaise',anchor:'saved-card',offset:100,pages:1}));
 const scroll=jest.spyOn(window,'scrollTo').mockImplementation(()=>undefined);
 jest.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockReturnValue({top:900,y:900,left:0,x:0,right:100,bottom:1000,height:100,width:100,toJSON:()=>({})});
 const view=render(<MemoryRouter initialEntries={['/kitchen/recipes?cuisine=francaise']}><Harness loaded={false}/></MemoryRouter>);
 expect(scroll).not.toHaveBeenCalled();view.rerender(<MemoryRouter><Harness loaded/></MemoryRouter>);
 await waitFor(()=>expect(scroll).toHaveBeenCalledWith({top:800,behavior:'auto'}));
 expect(document.activeElement).toHaveTextContent('La recette');
});
