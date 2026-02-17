import React from 'react';

interface SectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Section: React.FC<SectionProps> = ({ title, children, className = '', ...props }) => (
  <section className={`mb-10 ${className}`} {...props}>
    {title && <h2 className="text-2xl font-semibold mb-6 text-[#1D1D1F] dark:text-white tracking-tight">{title}</h2>}
    {children}
  </section>
);
