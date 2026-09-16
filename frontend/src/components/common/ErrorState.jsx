import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';
import './Feedback.css';

const ErrorState = ({
  title = 'Something went wrong',
  message = 'We encountered an error loading this information. Please try again.',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`error-state-box ${className}`}>
      <div className="error-icon-circle">
        <AlertCircle size={32} />
      </div>
      <h4 className="error-title">{title}</h4>
      <p className="error-desc">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          icon={RefreshCw}
          onClick={onRetry}
          className="error-retry-btn"
        >
          Try Again
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
