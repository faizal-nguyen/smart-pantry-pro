import {render,screen} from '@testing-library/react';
import type {NutritionEstimate} from '@smart/shared';
import NutritionEstimateView from '../NutritionEstimateView';
test('shows macros, micronutrients, unknowns and bounds without rounding a positive bound to zero',()=>{
 const nutrition:NutritionEstimate={status:'estimated',coverage:1,known_ingredients:1,total_ingredients:1,
  per_serving:{energyKcal:150,proteinG:10,fiberG:3,carbsG:null,fatG:0.00001,vitaminCMg:5},upper_bounds:['fatG'],
  sources:[{source:'ciqual2020',base:'100g',updated_at:'2020-07-07',url:'https://ciqual.anses.fr/'}],limitations:['Valeurs estimées avant cuisson.']};
 render(<NutritionEstimateView nutrition={nutrition}/>);
 expect(screen.getByText('150 kcal')).toBeInTheDocument();
 expect(screen.getByText('< 0,0001 g')).toBeInTheDocument();
 expect(screen.getAllByText('Non renseigné').length).toBeGreaterThan(0);
 expect(screen.getByText('5 mg')).toBeInTheDocument();
 expect(screen.getByRole('link',{name:'Consulter la référence nutritionnelle'})).toHaveAttribute('href','https://ciqual.anses.fr/');
});
