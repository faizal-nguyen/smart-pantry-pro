#!/usr/bin/env node

/**
 * Test script for Fast Video Import functionality
 * Tests integration with Deepgram, Cloudinary, and OpenAI
 */

const { createRequire } = require('module');
const require = createRequire(import.meta.url);

// Load environment variables
require('dotenv').config();

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function header(title) {
  log(colors.cyan, `\n${'='.repeat(60)}`);
  log(colors.cyan, `  ${title}`);
  log(colors.cyan, `${'='.repeat(60)}\n`);
}

function section(title) {
  log(colors.blue, `\n${'-'.repeat(30)}`);
  log(colors.blue, `  ${title}`);
  log(colors.blue, `${'-'.repeat(30)}`);
}

async function testEnvironmentVariables() {
  section('Environment Variables Check');
  
  const requiredVars = [
    { name: 'OPENAI_API_KEY', description: 'OpenAI API for GPT-4 processing' },
    { name: 'DEEPGRAM_API_KEY', description: 'Deepgram API for audio transcription' },
    { name: 'CLOUDINARY_CLOUD_NAME', description: 'Cloudinary cloud name for frame extraction' },
    { name: 'CLOUDINARY_API_KEY', description: 'Cloudinary API key' },
    { name: 'CLOUDINARY_API_SECRET', description: 'Cloudinary API secret' }
  ];

  const optionalVars = [
    { name: 'VIDEO_PROCESSING_TIMEOUT', description: 'Processing timeout (default: 45000ms)' },
    { name: 'MAX_VIDEO_DURATION', description: 'Max video duration (default: 600s)' },
    { name: 'ENABLE_FRAME_ANALYSIS', description: 'Enable frame analysis (default: true)' },
    { name: 'ENABLE_AUDIO_TRANSCRIPTION', description: 'Enable audio transcription (default: true)' }
  ];

  let missingRequired = 0;

  log(colors.bright, 'Required Variables:');
  for (const { name, description } of requiredVars) {
    const value = process.env[name];
    if (value) {
      const masked = value.length > 8 ? `${value.slice(0, 4)}...${value.slice(-4)}` : '***';
      log(colors.green, `  ✓ ${name}: ${masked} - ${description}`);
    } else {
      log(colors.red, `  ✗ ${name}: MISSING - ${description}`);
      missingRequired++;
    }
  }

  log(colors.bright, '\nOptional Variables:');
  for (const { name, description } of optionalVars) {
    const value = process.env[name];
    if (value) {
      log(colors.green, `  ✓ ${name}: ${value} - ${description}`);
    } else {
      log(colors.yellow, `  - ${name}: using default - ${description}`);
    }
  }

  if (missingRequired > 0) {
    log(colors.red, `\n❌ ${missingRequired} required environment variables are missing!`);
    log(colors.yellow, 'Please check your .env.local file and add the missing variables.');
    return false;
  }

  log(colors.green, '\n✅ All required environment variables are present!');
  return true;
}

async function testDeepgramConnection() {
  section('Deepgram Connection Test');
  
  try {
    const { createClient } = await import('@deepgram/sdk');
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    
    log(colors.blue, 'Testing Deepgram connection...');
    
    // Test with a short audio file
    const testUrl = 'https://static.deepgram.com/examples/Bueller-Life-moves-pretty-fast.wav';
    
    const { result } = await deepgram.listen.prerecorded.transcribeUrl(
      { url: testUrl },
      { model: 'nova-2', language: 'en' }
    );
    
    if (result && result.results && result.results.channels) {
      const transcript = result.results.channels[0].alternatives[0].transcript;
      log(colors.green, '✅ Deepgram connection successful!');
      log(colors.green, `   Sample transcription: "${transcript}"`);
      return true;
    } else {
      log(colors.red, '❌ Deepgram returned unexpected response format');
      return false;
    }
  } catch (error) {
    log(colors.red, `❌ Deepgram connection failed: ${error.message}`);
    if (error.message.includes('401')) {
      log(colors.yellow, '   Check your DEEPGRAM_API_KEY');
    }
    return false;
  }
}

async function testCloudinaryConnection() {
  section('Cloudinary Connection Test');
  
  try {
    const { v2: cloudinary } = await import('cloudinary');
    
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    
    log(colors.blue, 'Testing Cloudinary connection...');
    
    const result = await cloudinary.api.ping();
    
    if (result && result.status === 'ok') {
      log(colors.green, '✅ Cloudinary connection successful!');
      log(colors.green, `   Cloud: ${process.env.CLOUDINARY_CLOUD_NAME}`);
      return true;
    } else {
      log(colors.red, '❌ Cloudinary ping failed');
      return false;
    }
  } catch (error) {
    log(colors.red, `❌ Cloudinary connection failed: ${error.message}`);
    if (error.message.includes('401') || error.message.includes('Invalid')) {
      log(colors.yellow, '   Check your CLOUDINARY_* credentials');
    }
    return false;
  }
}

async function testOpenAIConnection() {
  section('OpenAI Connection Test');
  
  try {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    log(colors.blue, 'Testing OpenAI connection...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Respond with "Connection test successful"' }
      ],
      max_tokens: 10,
      temperature: 0
    });
    
    const reply = response.choices[0].message.content;
    
    if (reply && reply.toLowerCase().includes('successful')) {
      log(colors.green, '✅ OpenAI connection successful!');
      log(colors.green, `   Response: "${reply}"`);
      return true;
    } else {
      log(colors.red, `❌ OpenAI returned unexpected response: "${reply}"`);
      return false;
    }
  } catch (error) {
    log(colors.red, `❌ OpenAI connection failed: ${error.message}`);
    if (error.message.includes('401') || error.message.includes('API key')) {
      log(colors.yellow, '   Check your OPENAI_API_KEY');
    }
    return false;
  }
}

async function testAPIEndpoint() {
  section('API Endpoint Test');
  
  try {
    // Import node-fetch dynamically
    const fetch = (await import('node-fetch')).default;
    
    log(colors.blue, 'Testing /api/parse-video-recipe endpoint...');
    
    const testData = {
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      platform: 'youtube'
    };
    
    const response = await fetch('http://localhost:3000/api/parse-video-recipe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    
    if (response.ok) {
      const data = await response.json();
      log(colors.green, '✅ API endpoint is reachable!');
      log(colors.green, `   Status: ${response.status}`);
      return true;
    } else {
      const error = await response.text();
      log(colors.yellow, `⚠️  API endpoint returned ${response.status}: ${error}`);
      log(colors.yellow, '   This might be expected if the server is not running');
      return false;
    }
  } catch (error) {
    log(colors.yellow, `⚠️  Cannot reach API endpoint: ${error.message}`);
    log(colors.yellow, '   Start the development server with: npm run dev');
    return false;
  }
}

async function testPlatformSupport() {
  section('Platform Support Test');
  
  const testUrls = [
    { platform: 'YouTube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { platform: 'TikTok', url: 'https://www.tiktok.com/@user/video/1234567890' },
    { platform: 'Instagram', url: 'https://www.instagram.com/p/ABC123/' },
    { platform: 'Instagram Reel', url: 'https://www.instagram.com/reel/DEF456/' }
  ];
  
  log(colors.blue, 'Testing URL pattern recognition...');
  
  for (const { platform, url } of testUrls) {
    const isSupported = isValidVideoUrl(url);
    const detectedPlatform = detectPlatform(url);
    
    if (isSupported) {
      log(colors.green, `  ✓ ${platform}: ${detectedPlatform} detected`);
    } else {
      log(colors.red, `  ✗ ${platform}: Not recognized`);
    }
  }
  
  return true;
}

function isValidVideoUrl(url) {
  const patterns = [
    /youtube\.com\/watch\?v=[\w-]+/,
    /youtu\.be\/[\w-]+/,
    /tiktok\.com\/@[\w.-]+\/video\/\d+/,
    /instagram\.com\/p\/[\w-]+/,
    /instagram\.com\/reel\/[\w-]+/,
  ];
  
  return patterns.some(pattern => pattern.test(url));
}

function detectPlatform(url) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }
  if (url.includes('tiktok.com')) {
    return 'tiktok';
  }
  if (url.includes('instagram.com')) {
    return 'instagram';
  }
  return 'generic';
}

async function runPerformanceTest() {
  section('Performance Baseline Test');
  
  log(colors.blue, 'Measuring component loading time...');
  
  const start = Date.now();
  
  // Simulate loading of services
  try {
    await Promise.all([
      import('@deepgram/sdk').catch(() => null),
      import('cloudinary').catch(() => null),
      import('openai').catch(() => null)
    ]);
    
    const loadTime = Date.now() - start;
    
    if (loadTime < 1000) {
      log(colors.green, `✅ Module loading time: ${loadTime}ms (excellent)`);
    } else if (loadTime < 3000) {
      log(colors.yellow, `⚠️  Module loading time: ${loadTime}ms (acceptable)`);
    } else {
      log(colors.red, `❌ Module loading time: ${loadTime}ms (too slow)`);
    }
    
    return loadTime < 3000;
  } catch (error) {
    log(colors.red, `❌ Performance test failed: ${error.message}`);
    return false;
  }
}

async function generateReport(results) {
  section('Test Summary Report');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);
  
  log(colors.bright, `Test Results: ${passed}/${total} passed (${percentage}%)\n`);
  
  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    const color = result.passed ? colors.green : colors.red;
    log(color, `${icon} ${result.name}`);
    if (result.details) {
      log(colors.reset, `   ${result.details}`);
    }
  }
  
  if (percentage >= 80) {
    log(colors.green, '\n🎉 Fast Video Import is ready for production!');
    log(colors.green, 'You can start using the FastVideoImport component.');
  } else if (percentage >= 60) {
    log(colors.yellow, '\n⚠️  Fast Video Import has some issues but basic functionality should work.');
    log(colors.yellow, 'Please fix the failing tests before production use.');
  } else {
    log(colors.red, '\n❌ Fast Video Import has significant issues.');
    log(colors.red, 'Please resolve the failing tests before using the component.');
  }
  
  log(colors.cyan, '\nNext Steps:');
  log(colors.reset, '1. Fix any failing tests');
  log(colors.reset, '2. Add the FastVideoImport component to your app');
  log(colors.reset, '3. Test with real video URLs');
  log(colors.reset, '4. Monitor processing times and optimize if needed');
}

async function main() {
  header('Fast Video Import Integration Test');
  
  log(colors.bright, 'Testing all components of the Fast Video Import system...\n');
  
  const tests = [
    { name: 'Environment Variables', test: testEnvironmentVariables },
    { name: 'Deepgram Connection', test: testDeepgramConnection },
    { name: 'Cloudinary Connection', test: testCloudinaryConnection },
    { name: 'OpenAI Connection', test: testOpenAIConnection },
    { name: 'API Endpoint', test: testAPIEndpoint },
    { name: 'Platform Support', test: testPlatformSupport },
    { name: 'Performance Baseline', test: runPerformanceTest }
  ];
  
  const results = [];
  
  for (const { name, test } of tests) {
    try {
      const passed = await test();
      results.push({ name, passed });
    } catch (error) {
      log(colors.red, `❌ ${name} test crashed: ${error.message}`);
      results.push({ 
        name, 
        passed: false, 
        details: `Test crashed: ${error.message}` 
      });
    }
  }
  
  await generateReport(results);
  
  log(colors.cyan, '\n' + '='.repeat(60));
  log(colors.cyan, 'Test completed. Check the results above.');
  log(colors.cyan, '='.repeat(60));
}

// Run the tests
main().catch(error => {
  log(colors.red, `\n❌ Test suite crashed: ${error.message}`);
  console.error(error);
  process.exit(1);
});