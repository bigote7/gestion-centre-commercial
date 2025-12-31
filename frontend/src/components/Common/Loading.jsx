import React from 'react';
import './Loading.css';

export const Loading = ({ size = 'medium', text = 'Chargement...', fullScreen = false }) => {
  const containerClass = fullScreen 
    ? 'loading-fullscreen' 
    : `loading-container loading-${size}`;

  return (
    <div className={containerClass}>
      <div className="loading-spinner"></div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
};

export const LoadingButton = ({ loading, children, className = '', ...props }) => {
  return (
    <button 
      {...props} 
      className={`${className} ${loading ? 'loading-button' : ''}`}
      disabled={loading || props.disabled}
    >
      {loading && <span className="spinner-small"></span>}
      {children}
    </button>
  );
};

export const LoadingSpinner = ({ size = 'small' }) => (
  <div className={`loading-spinner-only spinner-${size}`}></div>
);

