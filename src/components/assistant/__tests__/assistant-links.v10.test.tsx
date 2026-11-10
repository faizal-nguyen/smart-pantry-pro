import {render,screen} from '@testing-library/react';
import {AssistantText} from '../AssistantText';
test('recipe citations are clickable while markup and unsafe schemes stay text',()=>{
  render(<AssistantText text={'[Recette](https://example.com/recette) <script>alert(1)</script> [interdit](javascript:alert(1))'}/>);
  expect(screen.getByRole('link',{name:'Recette'})).toHaveAttribute('href','https://example.com/recette');
  expect(screen.getAllByRole('link')).toHaveLength(1);expect(document.querySelector('script')).toBeNull();
});
test('formats recipe titles in bold, including escaped asterisks, without interpreting HTML',()=>{
  render(<AssistantText text={'**Radis noir et carotte**\n\\*\\*Infusion de gingembre\\*\\* <img src=x onerror=alert(1)>'}/>);
  expect(screen.getByText('Radis noir et carotte').tagName).toBe('STRONG');
  expect(screen.getByText('Infusion de gingembre').tagName).toBe('STRONG');
  expect(document.querySelector('img')).toBeNull();
});
