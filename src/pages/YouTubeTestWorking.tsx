import React, { useState } from 'react';
import { YouTubeVideoParser } from '@/services/video/youtubeVideoParser';
import { YouTubeVideoParserBasic } from '@/services/video/youtubeVideoParserBasic';
import { YouTubeVideoParserServer } from '@/services/video/youtubeVideoParserServer';

export default function YouTubeTestWorking() {
  const [videoUrl, setVideoUrl] = useState('https://www.youtube.com/watch?v=6GmNXKcTrLE');
  const [language, setLanguage] = useState('fr');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [useRealExtraction, setUseRealExtraction] = useState(true);
  const [useServerExtraction, setUseServerExtraction] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [extractionMode, setExtractionMode] = useState<'single' | 'complete'>('single');

  const basicParser = new YouTubeVideoParserBasic();
  const serverParser = new YouTubeVideoParserServer();
  const supportedLanguages = basicParser.getSupportedLanguages();

  const handleExtract = async () => {
    if (!videoUrl) {
      setError('Please enter a YouTube URL');
      return;
    }

    if (!basicParser.isYouTubeUrl(videoUrl)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(0);

    try {
      let recipe;
      if (useRealExtraction && useServerExtraction) {
        // Utiliser l'extraction côté serveur
        console.log('🚀 Using server-side extraction...');
        recipe = await serverParser.parseYouTubeRecipe(videoUrl, {
          language: language as any,
          onProgress: (prog) => setProgress(prog)
        });
      } else if (useRealExtraction) {
        // Tenter d'initialiser le vrai parser seulement si nécessaire
        try {
          const realParser = new YouTubeVideoParser();
          recipe = await realParser.parseYouTubeRecipe(videoUrl, {
            language: language as any,
            autoDetectLanguage: language === 'auto',
            onProgress: (prog) => setProgress(prog),
            quality: 'balanced'
          });
        } catch (initError: any) {
          setError(`Real extraction failed: ${initError.message}. Please check your API keys or enable server extraction.`);
          setLoading(false);
          return;
        }
      } else {
        // Utiliser le parser de simulation
        recipe = await basicParser.parseYouTubeRecipe(videoUrl, {
          language: language as any,
          autoDetectLanguage: language === 'auto',
          onProgress: (prog) => setProgress(prog),
          quality: 'balanced'
        });
      }

      setResult(recipe);

    } catch (err: any) {
      console.error('Extraction error:', err);
      setError(err.message || 'Failed to extract recipe');
    } finally {
      setLoading(false);
    }
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
            fontSize: '28px', 
            fontWeight: '700', 
            color: '#1e293b',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            🎥 YouTube Recipe Extractor
          </h1>
          <p style={{ color: '#64748b', fontSize: '16px' }}>
            {useRealExtraction 
              ? 'Real extraction with audio transcription (FR/EN/HI via Deepgram, TA via Whisper)'
              : 'Browser-compatible demo with realistic recipe simulation'
            }
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '600',
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
              padding: '14px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151'
          }}>
            Language:
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{
              width: '100%',
              padding: '14px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          >
            {supportedLanguages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name} ({lang.api})
              </option>
            ))}
          </select>
          <p style={{ 
            fontSize: '12px', 
            color: '#6b7280', 
            marginTop: '6px',
            fontStyle: 'italic'
          }}>
            {useRealExtraction ? 'Real transcription: Deepgram for FR/EN/HI, OpenAI Whisper for Tamil' : 'Browser simulation mode'}
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={useRealExtraction}
              onChange={(e) => setUseRealExtraction(e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                cursor: 'pointer'
              }}
            />
            <span>🎙️ Use Real Audio Extraction & Transcription</span>
            {useRealExtraction && (
              <span style={{ 
                fontSize: '12px', 
                color: '#dc2626',
                fontStyle: 'italic',
                fontWeight: 'normal'
              }}>
                (Requires API keys)
              </span>
            )}
          </label>
          <p style={{ 
            fontSize: '12px', 
            color: '#6b7280', 
            marginTop: '6px',
            marginLeft: '30px',
            fontStyle: 'italic'
          }}>
            {useRealExtraction 
              ? 'Will extract audio and transcribe using Deepgram/Whisper APIs' 
              : 'Safe browser-compatible demo with realistic recipe simulation'
            }
          </p>
        </div>

        {useRealExtraction && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              cursor: 'pointer',
              marginLeft: '30px'
            }}>
              <input
                type="checkbox"
                checked={useServerExtraction}
                onChange={(e) => setUseServerExtraction(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer'
                }}
              />
              <span>🖥️ Use Server-Side Extraction</span>
              <span style={{ 
                fontSize: '12px', 
                color: '#059669',
                fontStyle: 'italic',
                fontWeight: 'normal'
              }}>
                (Recommended - bypasses API issues)
              </span>
            </label>
            <p style={{ 
              fontSize: '12px', 
              color: '#6b7280', 
              marginTop: '6px',
              marginLeft: '60px',
              fontStyle: 'italic'
            }}>
              Uses server API to extract metadata without YouTube API key restrictions
            </p>
          </div>
        )}

        <button
          onClick={handleExtract}
          disabled={loading || !videoUrl}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: loading ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          {loading ? `🔄 Processing... ${progress}%` : '▶️ Extract Recipe'}
        </button>

        {loading && (
          <div style={{ marginTop: '16px' }}>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#3b82f6',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <p style={{ 
              textAlign: 'center', 
              marginTop: '8px',
              fontSize: '14px',
              color: '#6b7280'
            }}>
              {progress}% Complete
            </p>
          </div>
        )}

        {error && (
          <div style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px'
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#dc2626',
              marginBottom: '8px'
            }}>
              ❌ Error:
            </h3>
            <p style={{ fontSize: '14px', color: '#b91c1c', margin: 0 }}>
              {error}
            </p>
          </div>
        )}

        {result && (
          <div style={{
            marginTop: '32px',
            padding: '24px',
            backgroundColor: '#f0f9ff',
            border: '2px solid #0ea5e9',
            borderRadius: '12px'
          }}>
            <h2 style={{ 
              fontSize: '24px', 
              fontWeight: '600', 
              color: '#0c4a6e',
              marginBottom: '16px'
            }}>
              ✅ Recipe Extracted Successfully!
            </h2>

            {result.metadata.thumbnail && (
              <div style={{
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                <img 
                  src={result.metadata.thumbnail.url}
                  alt={result.title}
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                    borderRadius: '8px',
                    maxHeight: '300px'
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                color: '#0c4a6e',
                marginBottom: '8px'
              }}>
                {result.title}
              </h3>
              <p style={{ fontSize: '16px', color: '#0369a1', marginBottom: '12px' }}>
                {result.description}
              </p>
              <div style={{ 
                fontSize: '14px', 
                color: '#075985',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <span>🌐 Language: {result.metadata.language}</span>
                <span>🔧 Method: {result.metadata.extractionMethod}</span>
                <span>⏱️ Processing: {result.metadata.processingTime}ms</span>
                <span>📊 Confidence: {(result.metadata.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: '#0c4a6e',
                marginBottom: '12px'
              }}>
                📝 Ingredients ({result.ingredients.length}):
              </h4>
              <ul style={{ 
                listStyle: 'none', 
                padding: 0, 
                margin: 0 
              }}>
                {result.ingredients.map((ingredient: any, index: number) => (
                  <li key={index} style={{ 
                    padding: '8px 16px',
                    backgroundColor: '#e0f2fe',
                    borderRadius: '6px',
                    marginBottom: '6px',
                    fontSize: '14px',
                    color: '#0c4a6e'
                  }}>
                    • {ingredient.amount} {ingredient.unit} {ingredient.name}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: '#0c4a6e',
                marginBottom: '12px'
              }}>
                👩‍🍳 Instructions:
              </h4>
              <div style={{ space: '12px 0' }}>
                {result.instructions.map((instruction: any, index: number) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    marginBottom: '12px'
                  }}>
                    <span style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: '600',
                      flexShrink: 0
                    }}>
                      {instruction.step}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ 
                        fontSize: '14px', 
                        color: '#0c4a6e',
                        margin: '0 0 4px 0'
                      }}>
                        {instruction.description}
                      </p>
                      {instruction.duration && (
                        <span style={{ 
                          fontSize: '12px', 
                          color: '#0369a1',
                          fontStyle: 'italic'
                        }}>
                          ⏱️ {instruction.duration}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{
          marginTop: '32px',
          padding: '20px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #10b981',
          borderRadius: '8px'
        }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '600', 
            color: '#059669',
            marginBottom: '12px'
          }}>
            🎬 Real YouTube Extraction - Features:
          </h3>
          <ul style={{ 
            fontSize: '14px', 
            color: '#047857', 
            paddingLeft: '20px',
            margin: 0,
            lineHeight: '1.6'
          }}>
            <li>✅ Real YouTube video metadata extraction</li>
            <li>✅ Audio extraction and transcription (Deepgram + Whisper)</li>
            <li>✅ Multi-language support (FR/EN/HI/TA)</li>
            <li>✅ GPT-4 recipe synthesis from transcription</li>
            <li>✅ Progress tracking and error handling</li>
            <li>✅ Recipe structure with ingredients and instructions</li>
          </ul>
        </div>
      </div>
    </div>
  );
}