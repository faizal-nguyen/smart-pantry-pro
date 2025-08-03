import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBarcodeAPI } from '@/hooks/useBarcodeAPI';

const BarcodeTest = () => {
  const [barcode, setBarcode] = useState('3017620422003');
  const [result, setResult] = useState<{ status: number; product?: { name: string; brand?: string; category?: string; image_url?: string } } | null>(null);
  const { fetchProductInfo, loading, error } = useBarcodeAPI();

  const handleTest = async () => {
    console.log('🧪 Testing barcode:', barcode);
    const response = await fetchProductInfo(barcode);
    console.log('📦 Test result:', response);
    setResult(response);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Test API Codes-Barres</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Code-barres</Label>
          <Input
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="ex: 3017620422003"
          />
        </div>
        
        <Button onClick={handleTest} disabled={loading} className="w-full">
          {loading ? 'Test en cours...' : 'Tester API'}
        </Button>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <h4 className="font-medium">Résultat:</h4>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
            
            {result.product && (
              <div className="space-y-2">
                <div className="flex gap-3">
                  {result.product.image_url && (
                    <img 
                      src={result.product.image_url} 
                      alt={result.product.name}
                      className="w-16 h-16 rounded-lg object-cover border"
                    />
                  )}
                  <div>
                    <p className="font-medium">{result.product.name}</p>
                    {result.product.brand && (
                      <p className="text-sm text-gray-600">Marque: {result.product.brand}</p>
                    )}
                    {result.product.category && (
                      <p className="text-sm text-gray-600">Catégorie: {result.product.category}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BarcodeTest; 