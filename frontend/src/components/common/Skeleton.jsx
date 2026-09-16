import React from 'react';
import './Feedback.css';

const Skeleton = ({
  width = '100%',
  height = '20px',
  borderRadius = 'var(--radius-sm)',
  className = '',
  circle = false,
}) => {
  return (
    <div
      className={`skeleton-box skeleton-pulse ${circle ? 'skeleton-circle' : ''} ${className}`}
      style={{
        width,
        height,
        borderRadius: circle ? '50%' : borderRadius,
      }}
    />
  );
};

export default Skeleton;
