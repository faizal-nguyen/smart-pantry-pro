import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export const InstagramDebugExtractor: React.FC = () => {
  const [url, setUrl] = useState('https://www.instagram.com/reel/DHbVTRpo7p3/');
  const [status, setStatus] = useState<string[]>([]);
  
  const addStatus = (message: string) => {
    console.log(message);
    setStatus(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };
  
  const testExtraction = async () => {
    setStatus([]);
    addStatus('🚀 Début du test...');
    
    try {
      // Test 1: Script Python direct
      addStatus('📍 Test 1: Appel direct du script Python');
      const pythonResponse = await fetch('/api/social/instagram-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      if (pythonResponse.ok) {
        const pythonData = await pythonResponse.json();
        addStatus(`✅ Python API: ${pythonData.success ? 'Succès' : 'Échec'}`);
        if (pythonData.thumbnail_url) {
          addStatus(`🖼️ Vignette Python: ${pythonData.thumbnail_url}`);
        }
      } else {
        addStatus(`❌ Python API: Erreur ${pythonResponse.status}`);
      }
    } catch (error) {
      addStatus(`❌ Python API: ${error.message}`);
    }
    
    try {
      // Test 2: API parse-video-recipe
      addStatus('📍 Test 2: API parse-video-recipe');
      const parseResponse = await fetch('/api/parse-video-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: url, platform: 'instagram' })
      });
      
      if (parseResponse.ok) {
        const parseData = await parseResponse.json();
        addStatus(`✅ Parse API: ${parseData.success ? 'Succès' : 'Échec'}`);
        
        if (parseData.data?.metadata?.thumbnail) {
          addStatus(`🖼️ Vignette Parse: ${parseData.data.metadata.thumbnail.url || parseData.data.metadata.thumbnail}`);
        } else {
          addStatus('❌ Pas de vignette dans les métadonnées');
        }
      } else {
        addStatus(`❌ Parse API: Erreur ${parseResponse.status}`);
      }
    } catch (error) {
      addStatus(`❌ Parse API: ${error.message}`);
    }
    
    addStatus('✅ Test terminé');
  };
  
  return (
    <Card className="p-4">
      <h3 className="text-lg font-bold mb-4">🔍 Debug Instagram Thumbnail</h3>
      
      <div className="space-y-4">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="URL Instagram"
        />
        
        <Button onClick={testExtraction} className="w-full">
          Tester l'extraction
        </Button>
        
        <div className="bg-gray-100 p-3 rounded font-mono text-xs space-y-1 max-h-64 overflow-y-auto">
          {status.length === 0 ? (
            <div className="text-gray-500">En attente...</div>
          ) : (
            status.map((msg, idx) => (
              <div key={idx} className={
                msg.includes('✅') ? 'text-green-600' :
                msg.includes('❌') ? 'text-red-600' :
                msg.includes('🖼️') ? 'text-blue-600 font-bold' :
                'text-gray-700'
              }>
                {msg}
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
};