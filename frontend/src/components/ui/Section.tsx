import React from 'react';

interface SectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Section: React.FC<SectionProps> = ({ title, children, className = '', ...props }) => (
  <section className={`mb-8 ${className}`} {...props}>
    {title && <h2 className="text-xl font-semibold mb-4 text-gray-800">{title}</h2>}
    {children}
  </section>
);
