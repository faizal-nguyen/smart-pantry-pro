/**
 * Test script for Instagram oEmbed endpoint
 * Run with: node test-instagram-oembed.js
 */

async function testInstagramOEmbed() {
  const testUrl = 'https://www.instagram.com/p/C1234567890/'; // Replace with a real Instagram URL
  const endpoint = 'http://localhost:3000/api/social/instagram-oembed';

  console.log('🧪 Testing Instagram oEmbed endpoint...');
  console.log(`📍 Endpoint: ${endpoint}`);
  console.log(`🔗 Test URL: ${testUrl}`);
  console.log('');

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: testUrl })
    });

    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    console.log('📦 Response Data:', JSON.stringify(data, null, 2));

    if (response.ok && data.success) {
      console.log('\n✅ SUCCESS: Instagram oEmbed endpoint is working!');
      console.log('📝 Extracted Data:');
      console.log(`   - Author: ${data.data?.author_name || 'N/A'}`);
      console.log(`   - Caption: ${data.data?.caption?.substring(0, 50)}...` || 'N/A');
      console.log(`   - Thumbnail: ${data.data?.thumbnail_url ? 'Available' : 'Not available'}`);
    } else {
      console.log('\n❌ FAILED: Instagram oEmbed endpoint returned an error');
      console.log(`   Error: ${data.error || 'Unknown error'}`);
    }

  } catch (error) {
    console.error('\n🚨 ERROR: Failed to connect to endpoint');
    console.error(`   ${error.message}`);
    console.error('\n💡 Make sure the development server is running on port 3000');
  }
}

// Run the test
testInstagramOEmbed();