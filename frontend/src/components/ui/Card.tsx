import React from 'react';

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-black/5 dark:border-gray-700 p-6 hover:shadow-md transition-shadow duration-300 ease-out ${className}`}>
      {children}
    </div>
  );
};

export default Card;
