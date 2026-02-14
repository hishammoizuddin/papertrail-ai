import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: 'primary' | 'success' | 'danger' | 'warning' | 'default';
  children: React.ReactNode;
}

const colorMap = {
  primary: 'bg-blue-100 text-blue-800',
  success: 'bg-green-100 text-green-800',
  danger: 'bg-red-100 text-red-800',
  warning: 'bg-yellow-100 text-yellow-800',
  default: 'bg-gray-100 text-gray-800',
};

export const Badge: React.FC<BadgeProps> = ({ color = 'default', children, className = '', ...props }) => (
  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[color]} ${className}`} {...props}>
    {children}
  </span>
);
