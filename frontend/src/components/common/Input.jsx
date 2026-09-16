import React, { forwardRef } from 'react';
import './FormControls.css';

const Input = forwardRef(({
  id,
  type = 'text',
  name,
  value,
  defaultValue,
  placeholder,
  disabled = false,
  readOnly = false,
  error,
  icon: Icon,
  endIcon: EndIcon,
  onEndIconClick,
  onChange,
  onBlur,
  onFocus,
  className = '',
  ...rest
}, ref) => {
  return (
    <div className={`input-container ${error ? 'input-error' : ''} ${disabled ? 'input-disabled' : ''} ${className}`}>
      {Icon && (
        <span className="input-icon-left">
          <Icon size={16} />
        </span>
      )}
      <input
        ref={ref}
        id={id}
        name={name}
        type={type}
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        onChange={onChange}
        onBlur={onBlur}
        onFocus={onFocus}
        className={`input-element ${Icon ? 'with-left-icon' : ''} ${EndIcon ? 'with-right-icon' : ''}`}
        {...rest}
      />
      {EndIcon && (
        <button
          type="button"
          tabIndex={onEndIconClick ? 0 : -1}
          onClick={onEndIconClick}
          className={`input-icon-right ${onEndIconClick ? 'clickable' : ''}`}
        >
          <EndIcon size={16} />
        </button>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
