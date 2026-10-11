import {render,screen} from '@testing-library/react';
import AssistantModelDetails from '../AssistantModelDetails';
const call={role:'dialogue',purpose:'tool_selection',transport:'responses',requested_model:'gpt-6-luna',served_model:'actual-served-alias',status:'completed',
  input_tokens:10,output_tokens:3,cached_input_tokens:0,cache_write_tokens:0,reasoning_tokens:0,usd:0.001,quality:'known',reason:null,pricing_version:'prices-test',duration_ms:200};
const receipt={invocation_id:'fictitious',configuration_version:'configuration-test',calls:[call],llm_usd:0.001,known_subtotal_usd:0.001,quality:'known',limit_reason:null,disclaimer:'Application estimate, not an OpenAI invoice'};
test('distinguishes the configured and actually served models without rendering a raw trace',()=>{
  render(<AssistantModelDetails receipt={receipt}/>);
  expect(screen.getByText(/Demandé : gpt-6-luna. Servi : actual-served-alias/)).toBeInTheDocument();
  expect(screen.getByText(/Coût calculé des modèles : \$0.001000/)).toBeInTheDocument();
  expect(screen.getByText(/distinct d’une facture/)).toBeInTheDocument();
});
test('a failed unpriced round never turns an incomplete total into a zero cost',()=>{
  render(<AssistantModelDetails receipt={{...receipt,quality:'unknown',llm_usd:null,calls:[call,{...call,purpose:'synthesis_fallback',status:'failed',usd:null,quality:'unknown',served_model:null}]}}/>);
  expect(screen.getByText('Coût total des modèles indisponible.')).toBeInTheDocument();
  expect(screen.getByText(/Sous-total connu : \$0.001000/)).toBeInTheDocument();
  expect(screen.getByText('Repli de synthèse',{exact:false})).toBeInTheDocument();
});
test('an estimate is labelled, and invalid or older metadata cannot display a raw secret',()=>{
  const view=render(<AssistantModelDetails receipt={{...receipt,quality:'estimated'}}/>);
  expect(screen.getByText(/Coût estimé des modèles/)).toBeInTheDocument();
  view.rerender(<AssistantModelDetails receipt={{...receipt,prompt:'PRIVATE_SECRET'}}/>);
  expect(view.container).toBeEmptyDOMElement();
});
