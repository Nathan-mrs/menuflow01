import React from 'react';

export const Badge = ({ text, type = 'featured' }) => {
  if (!text) return null;

  return (
    <span className={`badge badge-${type}`}>
      {text}
    </span>
  );
};
