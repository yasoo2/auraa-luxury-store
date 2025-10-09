import React from 'react';

function App() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f8f9fa',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '2rem',
        backgroundColor: 'white',
        borderRadius: '10px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        maxWidth: '500px'
      }}>
        <h1 style={{ color: '#d97706', marginBottom: '1rem', fontSize: '3rem' }}>
          Auraa Luxury ✨
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1.2rem', marginBottom: '1.5rem' }}>
          Premium Accessories Collection
        </p>
        <div style={{
          backgroundColor: '#10b981',
          color: 'white',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          <h2>🚀 Deployment Successful!</h2>
          <p>Vercel build completed without errors</p>
        </div>
        <div style={{ fontSize: '0.9rem', color: '#9ca3af' }}>
          <p>Build Time: {new Date().toLocaleString()}</p>
          <p>Version: 1.0.0</p>
          <p>Status: Production Ready ✅</p>
        </div>
      </div>
    </div>
  );
}

export default App;
