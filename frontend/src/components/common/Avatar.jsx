import React, { useState } from 'react';
import './Avatar.css';

const Avatar = ({
  src,
  alt = 'Avatar',
  name = '',
  size = 'md', // 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  status,      // 'online' | 'busy' | 'offline'
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  const getInitials = (text) => {
    if (!text) return '?';
    const parts = text.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const showImage = src && !imageError;

  return (
    <div className={`avatar-container avatar-${size} ${className}`}>
      {showImage ? (
        <img
          src={src}
          alt={alt || name}
          className="avatar-img"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="avatar-fallback" aria-label={name}>
          {getInitials(name || alt)}
        </div>
      )}
      {status && <span className={`avatar-status status-${status}`} />}
    </div>
  );
};

export default Avatar;
