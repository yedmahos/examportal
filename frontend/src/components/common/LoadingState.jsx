import React from 'react';
import './Feedback.css';

const LoadingState = ({
  message = 'Loading data...',
  fullScreen = false,
  className = '',
}) => {
  return (
    <div className={`loading-state-box ${fullScreen ? 'loading-fullscreen' : ''} ${className}`}>
      <div className="loading-spinner-rings">
        <div className="spinner-ring" />
        <div className="spinner-core" />
      </div>
      <p className="loading-msg">{message}</p>
    </div>
  );
};

export default LoadingState;
