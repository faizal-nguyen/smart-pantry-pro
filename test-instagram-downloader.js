import InstagramDownloader from './api/instagramDownloader.js';

async function testInstagramDownload() {
  console.log('🧪 Testing Instagram Downloader...');
  
  const downloader = new InstagramDownloader();
  const testUrl = 'https://www.instagram.com/reel/DK909L4ofTr/';
  
  try {
    console.log('🔗 Testing URL:', testUrl);
    const videoBuffer = await downloader.downloadVideo(testUrl);
    
    console.log('✅ Success! Video downloaded');
    console.log('📊 Video size:', videoBuffer.length, 'bytes');
    
    // Afficher tous les logs
    console.log('\n📋 Detailed logs:');
    downloader.getLogs().forEach(log => {
      console.log(`[${log.timestamp}] ${log.message}`, log.data || '');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Afficher tous les logs même en cas d'erreur
    console.log('\n📋 Error logs:');
    downloader.getLogs().forEach(log => {
      console.log(`[${log.timestamp}] ${log.message}`, log.data || '');
    });
  }
}

testInstagramDownload().catch(console.error);