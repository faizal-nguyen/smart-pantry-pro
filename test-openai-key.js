/**
 * Test OpenAI API key validity
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
dotenv.config({ path: join(__dirname, '.env.local') });

const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;

console.log('🔍 Testing OpenAI API key...\n');

if (!apiKey) {
  console.error('❌ No OpenAI API key found in environment variables');
  process.exit(1);
}

console.log(`📊 Key info:`);
console.log(`   Length: ${apiKey.length} characters`);
console.log(`   Starts with: ${apiKey.substring(0, 10)}...`);
console.log(`   Ends with: ...${apiKey.substring(apiKey.length - 10)}`);

// Test the API key
async function testKey() {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    console.log(`\n🌐 API Response: ${response.status} ${response.statusText}`);

    if (response.ok) {
      console.log('✅ API key is valid!');
      const data = await response.json();
      console.log(`📦 Available models: ${data.data.length}`);
    } else if (response.status === 401) {
      console.error('❌ API key is invalid (401 Unauthorized)');
      const error = await response.json().catch(() => ({}));
      console.error('Error details:', error.error?.message || 'Unknown error');
    } else {
      console.error(`❌ Unexpected status: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

testKey();