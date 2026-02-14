import React from 'react';
import { theme } from '../../theme';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const base = 'font-semibold rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
const sizes = {
  sm: 'px-3 py-1 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};
const variants = {
  primary: `bg-[${theme.colors.primary}] text-white hover:bg-[${theme.colors.primaryDark}]`,
  secondary: 'bg-white text-[${theme.colors.primary}] border border-[${theme.colors.primary}] hover:bg-[${theme.colors.primary}] hover:text-white',
  danger: 'bg-[${theme.colors.error}] text-white hover:bg-red-700',
  ghost: 'bg-transparent text-[${theme.colors.primary}] hover:bg-[${theme.colors.background}]',
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => (
  <button
    className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    {...props}
  >
    {children}
  </button>
);
