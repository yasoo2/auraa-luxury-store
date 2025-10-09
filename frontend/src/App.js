import React from 'react';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-amber-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-amber-800 mb-4">
            Auraa Luxury
          </h1>
          <p className="text-xl text-amber-700 mb-8">
            Premium Accessories Collection
          </p>
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-lg mx-auto">
            <h2 className="text-3xl font-semibold text-gray-800 mb-6">
              🚀 Deployment Success
            </h2>
            <p className="text-gray-600 mb-4">
              Vercel deployment is working correctly!
            </p>
            <div className="bg-green-50 p-4 rounded-lg mb-4">
              <p className="text-green-800 font-medium">
                ✅ Build completed successfully
              </p>
              <p className="text-green-600 text-sm">
                JSON parsing issues resolved
              </p>
            </div>
            <div className="text-sm text-gray-500 space-y-1">
              <div>Build time: {new Date().toLocaleString()}</div>
              <div>Version: 1.0.0</div>
              <div>Backend: auraa-luxury-store.onrender.com</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
