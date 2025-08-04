#!/usr/bin/env node

// Test des agents Smart Pantry
const { SmartPantryDebugDispatcher } = require('./smart-pantry-agents.js');

async function testSmartPantryAgents() {
  console.log('🥘 TEST DES AGENTS SMART PANTRY');
  console.log('================================\n');
  
  const dispatcher = new SmartPantryDebugDispatcher();
  
  // Test 1: Bug Voice & AI
  console.log('🎤 TEST 1: Bug Voice & AI');
  const voiceBug = "La reconnaissance vocale ne comprend pas 'j'ai 2 litres de lait', le micro fonctionne mais le parsing est incorrect";
  const voiceAnalysis = dispatcher.analyzeSmartPantryBug(voiceBug);
  const voiceAgent = dispatcher.assignSmartPantryAgent();
  console.log(`Agent assigné: ${voiceAgent.primary.agent}`);
  console.log(`Confiance: ${voiceAgent.primary.confidence.toFixed(1)}%`);
  console.log(`Urgence: ${voiceAnalysis.urgency}`);
  console.log(`Complexité: ${voiceAnalysis.complexity}`);
  console.log(`Fonctionnalités: ${voiceAnalysis.smartPantryFeatures.join(', ')}\n`);
  
  // Test 2: Bug Scanner & Camera
  console.log('📱 TEST 2: Bug Scanner & Camera');
  const scannerBug = "Le scanner ne reconnaît pas les codes EAN-13, la caméra s'active mais aucun code n'est détecté";
  const scannerAnalysis = dispatcher.analyzeSmartPantryBug(scannerBug);
  const scannerAgent = dispatcher.assignSmartPantryAgent();
  console.log(`Agent assigné: ${scannerAgent.primary.agent}`);
  console.log(`Confiance: ${scannerAgent.primary.confidence.toFixed(1)}%`);
  console.log(`Urgence: ${scannerAnalysis.urgency}`);
  console.log(`Complexité: ${scannerAnalysis.complexity}`);
  console.log(`Fonctionnalités: ${scannerAnalysis.smartPantryFeatures.join(', ')}\n`);
  
  // Test 3: Bug Inventory
  console.log('📦 TEST 3: Bug Inventory');
  const inventoryBug = "Les produits ne s'ajoutent pas à l'inventaire, Supabase retourne une erreur RLS";
  const inventoryAnalysis = dispatcher.analyzeSmartPantryBug(inventoryBug);
  const inventoryAgent = dispatcher.assignSmartPantryAgent();
  console.log(`Agent assigné: ${inventoryAgent.primary.agent}`);
  console.log(`Confiance: ${inventoryAgent.primary.confidence.toFixed(1)}%`);
  console.log(`Urgence: ${inventoryAnalysis.urgency}`);
  console.log(`Complexité: ${inventoryAnalysis.complexity}`);
  console.log(`Fonctionnalités: ${inventoryAnalysis.smartPantryFeatures.join(', ')}\n`);
  
  // Test 4: Bug Photo Upload
  console.log('📸 TEST 4: Bug Photo Upload');
  const photoBug = "L'upload des photos échoue sur Supabase Storage, les images ne s'affichent pas";
  const photoAnalysis = dispatcher.analyzeSmartPantryBug(photoBug);
  const photoAgent = dispatcher.assignSmartPantryAgent();
  console.log(`Agent assigné: ${photoAgent.primary.agent}`);
  console.log(`Confiance: ${photoAgent.primary.confidence.toFixed(1)}%`);
  console.log(`Urgence: ${photoAnalysis.urgency}`);
  console.log(`Complexité: ${photoAnalysis.complexity}`);
  console.log(`Fonctionnalités: ${photoAnalysis.smartPantryFeatures.join(', ')}\n`);
  
  // Test 5: Bug Mobile Performance
  console.log('📱 TEST 5: Bug Mobile Performance');
  const mobileBug = "L'application est lente sur mobile, PWA ne s'installe pas, performance dégradée";
  const mobileAnalysis = dispatcher.analyzeSmartPantryBug(mobileBug);
  const mobileAgent = dispatcher.assignSmartPantryAgent();
  console.log(`Agent assigné: ${mobileAgent.primary.agent}`);
  console.log(`Confiance: ${mobileAgent.primary.confidence.toFixed(1)}%`);
  console.log(`Urgence: ${mobileAnalysis.urgency}`);
  console.log(`Complexité: ${mobileAnalysis.complexity}`);
  console.log(`Fonctionnalités: ${mobileAnalysis.smartPantryFeatures.join(', ')}\n`);
  
  // Test 6: Bug AI Integration (cas actuel)
  console.log('🤖 TEST 6: Bug AI Integration (cas actuel)');
  const aiBug = "Le scan de code-barres ne remplit pas les champs automatiquement, l'API fonctionne mais pas l'intégration";
  const aiAnalysis = dispatcher.analyzeSmartPantryBug(aiBug);
  const aiAgent = dispatcher.assignSmartPantryAgent();
  console.log(`Agent assigné: ${aiAgent.primary.agent}`);
  console.log(`Confiance: ${aiAgent.primary.confidence.toFixed(1)}%`);
  console.log(`Urgence: ${aiAnalysis.urgency}`);
  console.log(`Complexité: ${aiAnalysis.complexity}`);
  console.log(`Fonctionnalités: ${aiAnalysis.smartPantryFeatures.join(', ')}\n`);
  
  console.log('✅ TESTS SMART PANTRY TERMINÉS');
  console.log('\n📊 RÉSUMÉ DES AGENTS:');
  console.log('🎤 VOICE & AI: Reconnaissance vocale, OpenAI, Parsing');
  console.log('📱 INVENTORY & CAMERA: Scanner, Photos, Supabase, Mobile');
}

testSmartPantryAgents().catch(console.error); 