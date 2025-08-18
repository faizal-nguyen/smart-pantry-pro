import fetch from 'node-fetch';
import { writeFileSync } from 'fs';

async function debugInstagramHTML() {
  console.log('🔍 Debugging Instagram HTML structure...');
  
  const url = 'https://www.instagram.com/reel/DK909L4ofTr/';
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
    }
  });
  
  const html = await response.text();
  console.log('📄 HTML length:', html.length);
  
  // Sauvegarder le HTML pour inspection
  writeFileSync('instagram-debug.html', html);
  console.log('💾 HTML saved to instagram-debug.html');
  
  // Chercher tous les patterns possibles
  console.log('\n🔍 Searching for video patterns...');
  
  const patterns = [
    { name: 'video_url', regex: /"video_url":"([^"]+)"/g },
    { name: 'videoUrl', regex: /"videoUrl":"([^"]+)"/g },
    { name: 'src with mp4', regex: /"src":"([^"]*\.mp4[^"]*)"/g },
    { name: 'url with mp4', regex: /"url":"([^"]*\.mp4[^"]*)"/g },
    { name: 'playback_url', regex: /"playback_url":"([^"]+)"/g },
    { name: 'video in GraphQL', regex: /"video":{"[^}]*"url":"([^"]+)"/g },
    { name: 'contentUrl', regex: /"contentUrl":"([^"]+)"/g }
  ];
  
  for (const pattern of patterns) {
    const matches = [...html.matchAll(pattern.regex)];
    console.log(`${pattern.name}: ${matches.length} matches`);
    matches.slice(0, 3).forEach((match, i) => {
      console.log(`  ${i+1}. ${match[1].substring(0, 100)}...`);
    });
  }
  
  // Chercher spécifiquement les scripts JSON
  console.log('\n📊 Searching for JSON scripts...');
  
  const scriptMatches = [...html.matchAll(/<script[^>]*>([^<]*(?:video|mp4|instagram)[^<]*)<\/script>/gi)];
  console.log(`Found ${scriptMatches.length} scripts with video/mp4 keywords`);
  
  scriptMatches.slice(0, 5).forEach((match, i) => {
    console.log(`Script ${i+1} (${match[1].length} chars):`);
    console.log(match[1].substring(0, 200) + '...\n');
  });
}

debugInstagramHTML().catch(console.error);