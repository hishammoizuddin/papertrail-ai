import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className }) => {
  return (
    <div
      className={`p-6 bg-gray-800 rounded-lg shadow-lg hover:scale-105 transform transition duration-300 ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
