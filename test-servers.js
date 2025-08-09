import http from 'http';

console.log('🧪 Testing server connectivity...\n');

// Test Frontend (Vite)
http.get('http://localhost:3000/', (res) => {
  console.log(`✅ Frontend (Vite) on port 3000: ${res.statusCode} ${res.statusMessage}`);
}).on('error', (err) => {
  console.log(`❌ Frontend (Vite) on port 3000: ${err.message}`);
});

// Test API
http.get('http://localhost:3001/api/health', (res) => {
  console.log(`✅ API on port 3001: ${res.statusCode} ${res.statusMessage}`);
}).on('error', (err) => {
  console.log(`❌ API on port 3001: ${err.message}`);
});

// Test Instagram endpoint through proxy
http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/social/instagram-oembed',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
}, (res) => {
  console.log(`✅ Instagram endpoint (via proxy): ${res.statusCode} ${res.statusMessage}`);
}).on('error', (err) => {
  console.log(`❌ Instagram endpoint: ${err.message}`);
}).end(JSON.stringify({ url: 'https://www.instagram.com/p/test/' }));