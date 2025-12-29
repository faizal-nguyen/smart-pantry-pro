/**
 * Index minimal pour tester le serveur sans les routes complexes
 */
import express from 'express';
import dotenv from 'dotenv';

// Charger .env
dotenv.config({ path: '.env' });

console.log('✓ Variables d\'environnement chargées');
console.log(`  SUPABASE_URL: ${process.env.SUPABASE_URL?.substring(0, 30)}...`);
console.log(`  PORT: ${process.env.PORT || 3030}`);

const app = express();
app.use(express.json());

// Route de test simple
app.get('/', (req, res) => {
  res.json({
    name: 'Smart Pantry API - Minimal',
    version: '1.0.0',
    status: 'running ✓',
    timestamp: new Date().toISOString(),
    env: {
      port: process.env.PORT,
      nodeEnv: process.env.NODE_ENV,
      supabaseConfigured: !!process.env.SUPABASE_URL
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3030;

app.listen(PORT, () => {
  console.log(`\n🎉 Serveur démarré avec succès!`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health\n`);
});
