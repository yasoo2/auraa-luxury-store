import React from 'react';

const SimpleButton = ({ children, onClick, className = "" }) => {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors ${className}`}
    >
      {children}
    </button>
  );
};

export default SimpleButton;