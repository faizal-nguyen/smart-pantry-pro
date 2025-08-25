import React from 'react';

function SimpleMaterialTest() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Simple Material Test</h1>
      
      <button 
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={() => {
          console.log('Standard button clicked!');
          alert('Standard button works!');
        }}
      >
        Standard HTML Button - Click Me
      </button>
      
      <div className="mt-4">
        <p>If the button above works, we know basic React event handling is working.</p>
      </div>
    </div>
  );
}

export default SimpleMaterialTest;