import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

const Button: React.FC<ButtonProps> = ({ children, onClick, className = '', disabled, variant = 'primary' }) => {
  const baseStyles = "px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-[#0071E3] text-white hover:bg-[#0077ED] shadow-sm hover:shadow-md",
    secondary: "bg-white text-gray-900 border border-gray-200 hover:bg-gray-50",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-black",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-sm",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
