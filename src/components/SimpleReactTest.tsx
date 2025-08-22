import React, { useState, useEffect } from 'react';

const SimpleReactTest: React.FC = () => {
  const [count, setCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    console.log('✅ SimpleReactTest mounted and hydrated successfully');
  }, []);

  return (
    <div style={{ 
      padding: '1rem', 
      background: mounted ? '#059669' : '#dc2626', 
      color: 'white', 
      borderRadius: '8px',
      margin: '1rem 0'
    }}>
      <h3>🧪 React Hydration Test</h3>
      <p>Status: {mounted ? '✅ Hydrated' : '❌ Not Hydrated'}</p>
      <p>Count: {count}</p>
      <button 
        onClick={() => setCount(c => c + 1)}
        style={{
          background: '#1f2937',
          color: 'white',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Click to test (+1)
      </button>
    </div>
  );
};

export default SimpleReactTest;