import fetch from 'node-fetch';

async function testVideoParser() {
  console.log('🧪 Testing video parser API...');
  
  // Test with a real Instagram reel URL
  const testUrl = 'https://www.instagram.com/reel/C9wJQO0M4Ej/';
  
  try {
    const response = await fetch('http://localhost:3003/api/parse-video-recipe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoUrl: testUrl,
        platform: 'instagram'
      })
    });

    const data = await response.json();
    console.log('\n📊 Response status:', response.status);
    console.log('📦 Response data:', JSON.stringify(data, null, 2));
    
    if (data.debug && data.debug.logs) {
      console.log('\n📝 Server logs:');
      data.debug.logs.forEach(log => {
        console.log(`  ${log.timestamp}: ${log.message}`);
        if (log.data) {
          console.log(`    Data:`, log.data);
        }
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testVideoParser();