import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import './Card.css';

const StatCard = ({
  icon: Icon,
  iconColor = 'var(--color-primary)',
  iconBg = 'var(--color-primary-light)',
  title,
  value,
  subValue,
  caption,
  delta,
  deltaType = 'positive', // 'positive' | 'negative' | 'neutral' | 'purple'
  onOptionsClick,
  onClick,
  to,
  className = '',
}) => {
  const navigate = useNavigate();

  const handleMoreClick = (e) => {
    e.stopPropagation();
    if (onOptionsClick) {
      onOptionsClick(e);
    } else if (to) {
      navigate(to);
    }
  };

  const handleCardClick = (e) => {
    if (onClick) {
      onClick(e);
    } else if (to) {
      navigate(to);
    }
  };

  return (
    <div
      className={`stat-card ${to || onClick ? 'stat-card-clickable' : ''} ${className}`}
      onClick={handleCardClick}
      role={to || onClick ? 'button' : undefined}
      tabIndex={to || onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if ((to || onClick) && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleCardClick(e);
        }
      }}
    >
      <div className="stat-card-top">
        <div className="stat-card-title-group">
          {Icon && (
            <div className="stat-icon-chip" style={{ backgroundColor: iconBg, color: iconColor }}>
              <Icon size={18} />
            </div>
          )}
          <span className="stat-card-label">{title}</span>
        </div>
        <button
          type="button"
          className="stat-more-btn"
          aria-label={`View details for ${title}`}
          title={`View details for ${title}`}
          onClick={handleMoreClick}
        >
          <MoreHorizontal size={16} />
        </button>
      </div>

      <div className="stat-card-value-row">
        <span className="stat-value">{value}</span>
        {subValue && <span className="stat-subvalue">/{subValue}</span>}
      </div>

      <div className="stat-card-bottom">
        {caption && <span className="stat-caption">{caption}</span>}
        {delta && (
          <span className={`stat-delta-badge delta-${deltaType}`}>
            {delta}
          </span>
        )}
      </div>
    </div>
  );
};

export default StatCard;
