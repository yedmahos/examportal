import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';
import './PageHeader.css';

const PageHeader = ({
  title,
  subtitle,
  backUrl,
  backText = 'Back',
  actions,
  badge,
  className = '',
}) => {
  const navigate = useNavigate();

  return (
    <div className={`page-header-wrapper ${className}`}>
      <div className="page-header-left">
        {backUrl && (
          <Button
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            onClick={() => (backUrl === -1 ? navigate(-1) : navigate(backUrl))}
            className="page-back-btn"
          >
            {backText}
          </Button>
        )}
        <div className="page-title-row">
          <h1 className="page-heading">{title}</h1>
          {badge && <div className="page-heading-badge">{badge}</div>}
        </div>
        {subtitle && <p className="page-subheading">{subtitle}</p>}
      </div>

      {actions && (
        <div className="page-header-actions">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
