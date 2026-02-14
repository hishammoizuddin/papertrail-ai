import React from 'react';
import { theme } from '../../theme';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <input
      className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[${theme.colors.primary}] ${error ? 'border-red-500' : 'border-gray-300'} ${className}`}
      {...props}
    />
    {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
  </div>
);
