import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔄 [API Route] Forwarding request to API server...');
    
    // Forward the request to the actual API server
    const response = await fetch('http://localhost:3003/api/youtube-extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(120000) // 2 minutes timeout
    });

    console.log('📨 [API Route] Response status:', response.status);
    console.log('📊 [API Route] Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error('❌ [API Route] API server error, status:', response.status);
      
      let errorMessage = 'API request failed';
      try {
        const errorText = await response.text();
        console.error('❌ [API Route] Error response body:', errorText.substring(0, 500));
        
        // Try to parse as JSON if possible
        if (errorText.trim().startsWith('{')) {
          const errorObj = JSON.parse(errorText);
          errorMessage = errorObj.error || errorMessage;
        } else {
          errorMessage = errorText || errorMessage;
        }
      } catch (parseError) {
        console.error('❌ [API Route] Failed to parse error response:', parseError);
      }
      
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    try {
      const responseText = await response.text();
      console.log('📄 [API Route] Response length:', responseText.length);
      console.log('📄 [API Route] Response preview:', responseText.substring(0, 200) + '...');
      
      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response from API server');
      }
      
      const data = JSON.parse(responseText);
      console.log('✅ [API Route] Successfully parsed JSON response');
      return NextResponse.json(data);
      
    } catch (parseError: any) {
      console.error('❌ [API Route] Failed to parse JSON response:', parseError);
      return NextResponse.json({ error: 'Invalid response from API server' }, { status: 502 });
    }

  } catch (error: any) {
    console.error('❌ [API Route] Proxy error:', error);
    
    if (error.name === 'TimeoutError') {
      return NextResponse.json({ error: 'Request timed out' }, { status: 504 });
    }
    
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}