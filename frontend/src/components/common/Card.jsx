import React from 'react';
import './Card.css';

const Card = ({
  children,
  className = '',
  title,
  subtitle,
  action,
  noPadding = false,
  headerAction,
  ...rest
}) => {
  const hasHeader = title || subtitle || action || headerAction;

  return (
    <div className={`card-panel ${className}`} {...rest}>
      {hasHeader && (
        <div className="card-header">
          <div className="card-header-titles">
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {(action || headerAction) && (
            <div className="card-header-action">
              {action || headerAction}
            </div>
          )}
        </div>
      )}
      <div className={`card-body ${noPadding ? 'no-padding' : ''}`}>
        {children}
      </div>
    </div>
  );
};

export default Card;
