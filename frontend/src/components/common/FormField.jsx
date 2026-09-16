import React from 'react';
import './FormControls.css';

const FormField = ({
  label,
  required = false,
  error,
  helperText,
  children,
  className = '',
  id,
}) => {
  return (
    <div className={`form-field ${error ? 'has-error' : ''} ${className}`}>
      {label && (
        <label htmlFor={id} className="form-label">
          {label}
          {required && <span className="form-required">*</span>}
        </label>
      )}
      <div className="form-control-wrapper">
        {children}
      </div>
      {error && <span className="form-error-msg" role="alert">{error}</span>}
      {!error && helperText && <span className="form-helper-text">{helperText}</span>}
    </div>
  );
};

export default FormField;
