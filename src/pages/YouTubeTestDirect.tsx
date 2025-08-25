import React, { useState } from 'react';

export default function YouTubeTestDirect() {
  const [videoUrl, setVideoUrl] = useState('');
  const [language, setLanguage] = useState('auto');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const supportedLanguages = [
    { code: 'auto', name: '🌐 Auto-detect' },
    { code: 'en', name: '🇬🇧 English' },
    { code: 'fr', name: '🇫🇷 Français' },
    { code: 'hi', name: '🇮🇳 हिन्दी' },
    { code: 'ta', name: '🇮🇳 தமிழ்' }
  ];

  const handleExtract = async () => {
    if (!videoUrl) {
      setResult('Please enter a YouTube URL');
      return;
    }

    setLoading(true);
    setResult('Processing...');

    // Simulate processing
    setTimeout(() => {
      setResult(`
        ✅ Test successful!
        🎬 URL: ${videoUrl}
        🌐 Language: ${language}
        📊 Interface is working correctly
        
        The YouTube Recipe Extractor interface is functional and ready for integration with the actual parsing service.
      `);
      setLoading(false);
    }, 2000);
  };

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '40px 20px', 
      fontFamily: 'system-ui, sans-serif' 
    }}>
      <div style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '32px'
      }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: '600', 
            color: '#1e293b',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🎥 YouTube Recipe Extractor - Direct Test
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            Testing interface functionality without complex dependencies
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151'
          }}>
            YouTube Video URL:
          </label>
          <input
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151'
          }}>
            Language:
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            {supportedLanguages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
          <p style={{ 
            fontSize: '12px', 
            color: '#6b7280', 
            marginTop: '4px' 
          }}>
            Deepgram: FR, EN, HI | Whisper: Tamil | Auto: Detect from metadata
          </p>
        </div>

        <button
          onClick={handleExtract}
          disabled={loading || !videoUrl}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: loading ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '🔄 Testing Interface...' : '▶️ Test Extract Recipe'}
        </button>

        {result && (
          <div style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: '#f0f9ff',
            border: '1px solid #0ea5e9',
            borderRadius: '8px'
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '500', 
              color: '#0c4a6e',
              marginBottom: '8px'
            }}>
              Test Results:
            </h3>
            <pre style={{ 
              fontSize: '14px', 
              color: '#0369a1',
              whiteSpace: 'pre-wrap',
              margin: 0
            }}>
              {result}
            </pre>
          </div>
        )}

        <div style={{
          marginTop: '32px',
          padding: '16px',
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px'
        }}>
          <h4 style={{ 
            fontSize: '14px', 
            fontWeight: '500', 
            color: '#92400e',
            marginBottom: '8px'
          }}>
            🧪 Test Mode Information
          </h4>
          <ul style={{ 
            fontSize: '12px', 
            color: '#a16207', 
            margin: 0,
            paddingLeft: '16px'
          }}>
            <li><strong>Purpose:</strong> Verify interface functionality</li>
            <li><strong>Languages:</strong> FR/EN/HI (Deepgram) + TA (Whisper)</li>
            <li><strong>Features:</strong> Auto detection, progress tracking, error handling</li>
            <li><strong>Next:</strong> Integration with YouTubeVideoParser service</li>
          </ul>
        </div>

        <div style={{ 
          marginTop: '20px', 
          textAlign: 'center',
          fontSize: '12px',
          color: '#6b7280'
        }}>
          Direct access test page - No complex routing or dependencies
        </div>
      </div>
    </div>
  );
}