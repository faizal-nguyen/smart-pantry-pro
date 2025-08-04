#!/usr/bin/env node

/**
 * CLAUDE COMMAND RUNNER 🥘🔧
 * 
 * Exécute les commandes .claude pour les agents Smart Pantry
 */

const { SmartPantryDebugDispatcher } = require('./smart-pantry-agents.js');

// Mapping des commandes .claude vers les agents
const CLAUDE_COMMANDS = {
  '/debug-voice': 'voice',
  '/debug-scanner': 'scanner', 
  '/debug-smart-pantry': 'analyze',
  '/debug-voice-ai': 'voice',
  '/debug-inventory-camera': 'scanner'
};

async function runClaudeCommand() {
  const args = process.argv.slice(2);
  const command = args[0];
  const input = args.slice(1).join(' ');

  if (!command || !input) {
    console.log(`
🥘 CLAUDE COMMAND RUNNER - SMART PANTRY
========================================

📖 USAGE:
  node claude-runner.js /debug-voice "La reconnaissance vocale ne comprend pas 'j'ai 2 litres de lait'"
  node claude-runner.js /debug-scanner "Le scanner ne reconnaît pas les codes EAN-13"
  node claude-runner.js /debug-smart-pantry "Le scan de code-barres ne remplit pas les champs automatiquement"

📝 COMMANDES DISPONIBLES:
  /debug-voice [voice-issue]            # Problèmes reconnaissance vocale
  /debug-scanner [scanner-issue]        # Scanner codes-barres
  /debug-smart-pantry [issue]           # Analyse Smart Pantry complète
  /debug-voice-ai [ai-issue]            # Bugs IA conversationnelle
  /debug-inventory-camera [camera-issue] # Accès caméra/inventaire

📝 EXEMPLES:
  /debug-voice "Le micro ne fonctionne pas sur mobile"
  /debug-scanner "La caméra ne s'active pas sur mobile"
  /debug-smart-pantry "L'application est lente sur mobile"
    `);
    process.exit(1);
  }

  const agentCommand = CLAUDE_COMMANDS[command];
  
  if (!agentCommand) {
    console.log(`❌ Commande inconnue: ${command}`);
    console.log('📖 Commandes disponibles:', Object.keys(CLAUDE_COMMANDS).join(', '));
    process.exit(1);
  }

  console.log(`🥘 CLAUDE COMMAND: ${command}`);
  console.log(`📝 INPUT: ${input}`);
  console.log(`🎯 AGENT: ${agentCommand}`);
  console.log('=====================================\n');

  const dispatcher = new SmartPantryDebugDispatcher();

  try {
    // Analyse du bug
    const analysis = dispatcher.analyzeSmartPantryBug(input);
    const agent = dispatcher.assignSmartPantryAgent();
    const investigation = await dispatcher.investigateSmartPantry();
    const solution = await dispatcher.developSmartPantrySolution();
    const validation = await dispatcher.validateSmartPantrySolution(solution);

    // Rapport final
    console.log('\n📋 RAPPORT CLAUDE COMMAND:');
    console.log('==========================');
    console.log(`🎯 Agent: ${agent.primary.agent}`);
    console.log(`📊 Confiance: ${agent.primary.confidence.toFixed(1)}%`);
    console.log(`🚨 Urgence: ${analysis.urgency}`);
    console.log(`🧩 Complexité: ${analysis.complexity}`);
    console.log(`🥘 Fonctionnalités: ${analysis.smartPantryFeatures.join(', ')}`);
    console.log(`✅ Validation: ${validation.resolved ? 'SUCCESS' : 'FAILED'}`);

    // Résumé de la solution
    console.log('\n🔧 SOLUTION PROPOSÉE:');
    console.log('=====================');
    solution.steps.forEach((step, index) => {
      console.log(`${index + 1}. ${step}`);
    });

    console.log('\n✅ CLAUDE COMMAND EXÉCUTÉE AVEC SUCCÈS!');

  } catch (error) {
    console.error('❌ ERREUR CLAUDE COMMAND:', error.message);
    process.exit(1);
  }
}

// Exécution directe
if (require.main === module) {
  runClaudeCommand();
}

module.exports = { runClaudeCommand, CLAUDE_COMMANDS }; 