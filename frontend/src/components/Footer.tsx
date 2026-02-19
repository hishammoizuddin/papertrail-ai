import React from 'react';
import { BRAND_NAME, COMPANY_LINK } from '../config';

const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full py-6 mt-auto border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6">
                    <span className="font-medium text-gray-900 dark:text-gray-200">
                        &copy; {currentYear} {BRAND_NAME}
                    </span>
                    <span className="hidden md:inline text-gray-300 dark:text-gray-700">|</span>
                    <span>All rights reserved.</span>
                </div>

                <div className="flex items-center gap-6">
                    <a
                        href={COMPANY_LINK}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                    >
                        About
                    </a>
                    <a
                        href="#"
                        className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                    >
                        Privacy
                    </a>
                    <a
                        href="#"
                        className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                    >
                        Terms
                    </a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
