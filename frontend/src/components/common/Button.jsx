import React from 'react';
import './Button.css';

const Button = ({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size = 'md',        // 'sm' | 'md' | 'lg'
  icon: Icon,
  iconPosition = 'left',
  isLoading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  type = 'button',
  onClick,
  ...rest
}) => {
  const label = typeof children === 'string' ? children.trim().toLowerCase() : '';
  const isDangerGhost = label === 'cancel' || label === 'log out' || label === 'logout';

  return (
    <button
      type={type}
      className={`btn btn-${variant} btn-${size} ${isDangerGhost ? 'btn-ghost-danger' : ''} ${fullWidth ? 'btn-full' : ''} ${isLoading ? 'btn-loading' : ''} ${className}`}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...rest}
    >
      {isLoading && <span className="btn-spinner" aria-hidden="true" />}
      {!isLoading && Icon && iconPosition === 'left' && (
        <Icon className="btn-icon btn-icon-left" size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
      )}
      <span className="btn-text">{children}</span>
      {!isLoading && Icon && iconPosition === 'right' && (
        <Icon className="btn-icon btn-icon-right" size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
      )}
    </button>
  );
};

export default Button;
