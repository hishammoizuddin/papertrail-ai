import React from 'react';

type BadgeColor = 'primary' | 'success' | 'warning' | 'danger' | 'default';

const Badge: React.FC<{ children: React.ReactNode; color?: BadgeColor }> = ({ children, color = 'default' }) => {
  const colors = {
    primary: 'bg-blue-100 text-blue-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-700',
    default: 'bg-gray-100 text-gray-700',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${colors[color]}`}>
      {children}
    </span>
  );
};

export { Badge };
