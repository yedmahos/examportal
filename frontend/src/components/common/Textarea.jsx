import React, { forwardRef } from 'react';
import './FormControls.css';

const Textarea = forwardRef(({
  id,
  name,
  value,
  defaultValue,
  placeholder,
  rows = 4,
  disabled = false,
  readOnly = false,
  error,
  onChange,
  onBlur,
  className = '',
  ...rest
}, ref) => {
  return (
    <div className={`textarea-container ${error ? 'textarea-error' : ''} ${disabled ? 'textarea-disabled' : ''} ${className}`}>
      <textarea
        ref={ref}
        id={id}
        name={name}
        rows={rows}
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        onChange={onChange}
        onBlur={onBlur}
        className="textarea-element"
        {...rest}
      />
    </div>
  );
});

Textarea.displayName = 'Textarea';
export default Textarea;
