#!/usr/bin/env node

// Test simple du debug dispatcher
const { DebugDispatcher } = require('./debug-dispatcher.js');

async function testDispatcher() {
  console.log('🧪 TEST DU DEBUG DISPATCHER');
  console.log('============================\n');
  
  const dispatcher = new DebugDispatcher();
  
  // Test 1: Bug Frontend
  console.log('📝 TEST 1: Bug Frontend');
  const bug1 = "useState ne met pas à jour le state, le composant ne re-render pas";
  const analysis1 = dispatcher.analyzeBug(bug1);
  const agent1 = dispatcher.assignAgent();
  console.log(`Agent assigné: ${agent1.primary.agent}`);
  console.log(`Confiance: ${agent1.primary.confidence.toFixed(1)}%`);
  console.log(`Urgence: ${analysis1.urgency}`);
  console.log(`Complexité: ${analysis1.complexity}\n`);
  
  // Test 2: Bug API
  console.log('📝 TEST 2: Bug API');
  const bug2 = "API /api/products retourne 500, erreur dans les logs serveur";
  const analysis2 = dispatcher.analyzeBug(bug2);
  const agent2 = dispatcher.assignAgent();
  console.log(`Agent assigné: ${agent2.primary.agent}`);
  console.log(`Confiance: ${agent2.primary.confidence.toFixed(1)}%`);
  console.log(`Urgence: ${analysis2.urgency}`);
  console.log(`Complexité: ${analysis2.complexity}\n`);
  
  // Test 3: Bug Database
  console.log('📝 TEST 3: Bug Database');
  const bug3 = "Supabase RLS bloque l'accès aux données, policy incorrecte";
  const analysis3 = dispatcher.analyzeBug(bug3);
  const agent3 = dispatcher.assignAgent();
  console.log(`Agent assigné: ${agent3.primary.agent}`);
  console.log(`Confiance: ${agent3.primary.confidence.toFixed(1)}%`);
  console.log(`Urgence: ${analysis3.urgency}`);
  console.log(`Complexité: ${analysis3.complexity}\n`);
  
  // Test 4: Bug Performance
  console.log('📝 TEST 4: Bug Performance');
  const bug4 = "L'application est lente sur mobile, bundle trop gros";
  const analysis4 = dispatcher.analyzeBug(bug4);
  const agent4 = dispatcher.assignAgent();
  console.log(`Agent assigné: ${agent4.primary.agent}`);
  console.log(`Confiance: ${agent4.primary.confidence.toFixed(1)}%`);
  console.log(`Urgence: ${analysis4.urgency}`);
  console.log(`Complexité: ${analysis4.complexity}\n`);
  
  // Test 5: Bug Integration (notre cas actuel)
  console.log('📝 TEST 5: Bug Integration (cas actuel)');
  const bug5 = "Le scan de code-barres ne remplit pas les champs automatiquement, l'API fonctionne mais pas l'intégration";
  const analysis5 = dispatcher.analyzeBug(bug5);
  const agent5 = dispatcher.assignAgent();
  console.log(`Agent assigné: ${agent5.primary.agent}`);
  console.log(`Confiance: ${agent5.primary.confidence.toFixed(1)}%`);
  console.log(`Urgence: ${analysis5.urgency}`);
  console.log(`Complexité: ${analysis5.complexity}\n`);
  
  console.log('✅ TESTS TERMINÉS');
}

testDispatcher().catch(console.error); 