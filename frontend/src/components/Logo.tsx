import React from 'react';
import { motion } from 'framer-motion';

interface LogoProps {
    className?: string;
    size?: number;
    animated?: boolean;
}

import { SHOW_BETA_TAG } from '../config';

const Logo: React.FC<LogoProps> = ({ className = "", size = 32, animated = false }) => {
    const pathVariants = {
        hidden: { pathLength: 0, opacity: 0 },
        visible: {
            pathLength: 1,
            opacity: 1,
            transition: {
                duration: 1.5,
                ease: "easeInOut" as const,
                repeat: animated ? Infinity : 0,
                repeatType: "reverse" as const,
                repeatDelay: 3
            }
        }
    };

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <svg
                width={size}
                height={size}
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <motion.path
                    d="M6 4h14l6 6v18H6V4z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    variants={pathVariants}
                    initial="hidden"
                    animate="visible"
                    className="text-blue-600 dark:text-blue-400"
                />
                <motion.path
                    d="M20 4v6h6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    variants={pathVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 0.5 }}
                    className="text-blue-500 dark:text-blue-300"
                />
                <motion.path
                    d="M10 14h12M10 18h12M10 22h8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    variants={pathVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 0.8 }}
                    className="text-indigo-500 dark:text-indigo-300"
                />
            </svg>
            <div className="flex items-center gap-2">
                <span className={`font-bold tracking-tight ${size > 24 ? 'text-xl' : 'text-lg'}`}>
                    PaperTrail <span className="text-blue-600 dark:text-blue-400">AI</span>
                </span>
                {SHOW_BETA_TAG && (
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 tracking-wide">
                        BETA
                    </span>
                )}
            </div>
        </div>
    );
};

export default Logo;
