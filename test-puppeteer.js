import puppeteer from 'puppeteer';

async function testPuppeteer() {
  console.log('🔍 Testing Puppeteer installation...');
  
  try {
    // Test sans puppeteer-core, avec puppeteer standard
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    console.log('✅ Puppeteer launched successfully\!');
    
    const page = await browser.newPage();
    await page.goto('https://www.google.com');
    
    console.log('✅ Navigation successful\!');
    
    await browser.close();
    console.log('✅ Browser closed successfully\!');
    
  } catch (error) {
    console.error('❌ Puppeteer error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testPuppeteer();
