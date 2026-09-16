import React from 'react';
import './StatusBadge.css';

const StatusBadge = ({
  status = '',
  variant, // optional manual override: 'success' | 'warning' | 'error' | 'info' | 'purple' | 'neutral'
  size = 'md', // 'sm' | 'md'
  className = '',
}) => {
  // Infer variant from status name if not explicitly provided
  let computedVariant = variant;
  if (!computedVariant && status) {
    const s = status.toLowerCase();
    if (['completed', 'published', 'active', 'pass', 'passed', 'approved', 'verified'].includes(s)) {
      computedVariant = 'success';
    } else if (['on-verification', 'pending', 'under review', 'in progress', 'warning', 'medium', 'normal'].includes(s)) {
      computedVariant = 'warning';
    } else if (['failed', 'fail', 'inactive', 'cancelled', 'rejected', 'error', 'urgent', 'high'].includes(s)) {
      computedVariant = 'error';
    } else if (['scheduled', 'info', 'all students', 'low'].includes(s)) {
      computedVariant = 'info';
    } else if (['draft', 'archived', 'postponed'].includes(s)) {
      computedVariant = 'neutral';
    } else {
      computedVariant = 'purple';
    }
  }

  return (
    <span className={`status-badge badge-${computedVariant || 'neutral'} badge-${size} ${className}`}>
      <span className="badge-dot" />
      <span className="badge-text">{status}</span>
    </span>
  );
};

export default StatusBadge;
