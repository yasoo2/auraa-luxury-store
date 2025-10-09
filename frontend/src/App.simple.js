import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';

function HomePage() {
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
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-auto">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              🚀 Deployment Test
            </h2>
            <p className="text-gray-600">
              If you can see this page, the Vercel deployment is working correctly!
            </p>
            <div className="mt-4 text-sm text-gray-500">
              Build: {new Date().toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;