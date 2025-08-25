import React from 'react';
import { MaterialButton } from '@/components/ui/material/Button';
import { SimpleButton } from '@/components/ui/material/SimpleButton';
import { MaterialCard, MaterialCardContent } from '@/components/ui/material/Card';
import { useMaterialYouTheme } from '@/contexts/MaterialYouThemeContext';

function TestMaterialYou() {
  const { theme, setSourceColor } = useMaterialYouTheme();
  
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Test Material You</h1>
      
      <div className="mb-6">
        <p>Current theme color: {theme.colors.source}</p>
        <p>Is dark mode: {theme.isDark ? 'Yes' : 'No'}</p>
        <p>Current context: {theme.currentContext}</p>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Simple Buttons (should work):</h3>
        <SimpleButton 
          variant="filled"
          onClick={() => {
            console.log('SimpleButton clicked!');
            alert('SimpleButton clicked!');
          }}
        >
          Simple Button - Click Me!
        </SimpleButton>
        
        <h3 className="text-lg font-semibold mt-6">Material Buttons (testing):</h3>
        <MaterialButton 
          variant="filled"
          onClick={() => {
            console.log('Button clicked!');
            alert('Material Button clicked!');
          }}
        >
          Test Button - Click Me!
        </MaterialButton>
        
        <MaterialButton 
          variant="outlined"
          onClick={() => setSourceColor('#FF5722')}
        >
          Change Theme Color to Orange
        </MaterialButton>
        
        <MaterialButton 
          variant="tonal"
          onClick={() => setSourceColor('#4CAF50')}
        >
          Change Theme Color to Green
        </MaterialButton>
      </div>
      
      <div className="mt-8">
        <MaterialCard variant="elevated">
          <MaterialCardContent>
            <h2 className="text-xl font-semibold mb-2">Material Card</h2>
            <p>This is a Material You card component.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try clicking the buttons above to change the theme color.
            </p>
          </MaterialCardContent>
        </MaterialCard>
      </div>
    </div>
  );
}

export default TestMaterialYou;