export default function YouTubeTestBasic() {
  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui' }}>
      <h1 style={{ color: '#1f2937', marginBottom: '16px' }}>
        🎥 YouTube Recipe Extractor - Basic Test
      </h1>
      
      <div style={{ 
        backgroundColor: '#f9fafb', 
        padding: '24px', 
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        maxWidth: '600px'
      }}>
        <p style={{ marginBottom: '16px', color: '#374151' }}>
          Interface de test ultra-basique pour vérifier que la page se charge sans erreurs.
        </p>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            URL YouTube:
          </label>
          <input 
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px'
            }}
          />
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Langue:
          </label>
          <select style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px'
          }}>
            <option value="auto">🌐 Auto-detect</option>
            <option value="fr">🇫🇷 Français</option>
            <option value="en">🇬🇧 English</option>
            <option value="hi">🇮🇳 हिन्दी</option>
            <option value="ta">🇮🇳 தமிழ்</option>
          </select>
        </div>
        
        <button style={{
          backgroundColor: '#3b82f6',
          color: 'white',
          padding: '12px 24px',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: '600',
          width: '100%'
        }}>
          ▶️ Tester l'extraction
        </button>
        
        <div style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: '#ecfdf5',
          border: '1px solid #10b981',
          borderRadius: '6px'
        }}>
          <h3 style={{ 
            color: '#059669', 
            marginBottom: '8px',
            fontSize: '16px'
          }}>
            ✅ Page fonctionnelle !
          </h3>
          <ul style={{ 
            color: '#047857', 
            fontSize: '14px',
            paddingLeft: '16px',
            margin: 0
          }}>
            <li>Interface de base chargée sans erreur</li>
            <li>Pas de conflit avec Cloudinary</li>
            <li>Prêt pour l'intégration du service d'extraction</li>
          </ul>
        </div>
        
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '6px',
          fontSize: '14px',
          color: '#92400e'
        }}>
          <strong>Prochaines étapes:</strong> Une fois cette interface validée, 
          nous intégrerons les services YouTubeVideoParser, AudioExtractor et Whisper/Deepgram.
        </div>
      </div>
    </div>
  );
}