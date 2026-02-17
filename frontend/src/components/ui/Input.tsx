import React from 'react';
import { theme } from '../../theme';


interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { }

const Input: React.FC<InputProps> = ({ className = '', ...props }) => {
  return (
    <input
      className={`w-full px-4 py-3 rounded-xl bg-gray-100/50 border-0 focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all duration-200 placeholder-gray-400 text-gray-900 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:bg-gray-900 ${className}`}
      {...props}
    />
  );
};

export default Input;
