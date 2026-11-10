import {render,screen} from '@testing-library/react';
import {AssistantText} from '../AssistantText';
test('recipe citations are clickable while markup and unsafe schemes stay text',()=>{
  render(<AssistantText text={'[Recette](https://example.com/recette) <script>alert(1)</script> [interdit](javascript:alert(1))'}/>);
  expect(screen.getByRole('link',{name:'Recette'})).toHaveAttribute('href','https://example.com/recette');
  expect(screen.getAllByRole('link')).toHaveLength(1);expect(document.querySelector('script')).toBeNull();
});
