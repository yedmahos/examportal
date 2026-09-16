import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import './FormControls.css';

const Select = forwardRef(({
  id,
  name,
  value,
  defaultValue,
  options = [],
  placeholder = 'Select an option',
  disabled = false,
  error,
  onChange,
  onBlur,
  className = '',
  ...rest
}, ref) => {
  return (
    <div className={`select-container ${error ? 'select-error' : ''} ${disabled ? 'select-disabled' : ''} ${className}`}>
      <select
        ref={ref}
        id={id}
        name={name}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        onChange={onChange}
        onBlur={onBlur}
        className="select-element"
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => {
          const val = typeof opt === 'object' ? opt.value : opt;
          const label = typeof opt === 'object' ? opt.label : opt;
          return (
            <option key={val} value={val}>
              {label}
            </option>
          );
        })}
      </select>
      <span className="select-chevron">
        <ChevronDown size={16} />
      </span>
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
