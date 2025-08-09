// Test script to verify environment variables
console.log('🔍 Checking environment variables...\n');

// Check if .env.local is loaded
const fs = require('fs');
const path = require('path');

// Check process.env (for server-side)
console.log('📌 Server-side variables:');
console.log(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set (length: ' + process.env.OPENAI_API_KEY.length + ')' : '❌ Not set'}`);
console.log(`VITE_OPENAI_API_KEY: ${process.env.VITE_OPENAI_API_KEY ? '✅ Set (length: ' + process.env.VITE_OPENAI_API_KEY.length + ')' : '❌ Not set'}`);

// Check if keys are identical
if (process.env.OPENAI_API_KEY && process.env.VITE_OPENAI_API_KEY) {
  const match = process.env.OPENAI_API_KEY === process.env.VITE_OPENAI_API_KEY;
  console.log(`\n🔑 Keys match: ${match ? '✅ Yes' : '❌ No (keys are different!)'}`);
  
  if (!match) {
    console.log('\n⚠️  WARNING: The two API keys are different!');
    console.log('This might cause authentication issues.');
  }
}

// Validate key format
const key = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
if (key) {
  console.log('\n🔐 Key validation:');
  console.log(`Starts with 'sk-': ${key.startsWith('sk-') ? '✅' : '❌'}`);
  console.log(`Length: ${key.length} characters`);
  
  // OpenAI keys are typically around 51 characters
  if (key.length > 100) {
    console.log('⚠️  Key seems unusually long for an OpenAI API key');
  }
}

console.log('\n💡 To test the key, run: npm run dev and check the browser console');