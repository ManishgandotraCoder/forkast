'use client';

import { X } from 'lucide-react';

interface DoubleProps {
    onClick: () => void;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'danger' | 'warning';
    className?: string;
    title?: string;
}

export default function ButtonComponent({
    onClick,
    disabled = false,
    size = 'md',
    variant = 'danger',
    className = '',
    title = 'Cancel'
}: DoubleProps) {


    const variantClasses = {
        default: 'text-gray-600 hover:text-gray-900',
        danger: 'text-red-600 hover:text-red-900',
        warning: 'text-yellow-600 hover:text-yellow-900'
    };

    const buttonClasses = {
        sm: 'p-1',
        md: 'p-1.5',
        lg: 'p-2'
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`
        inline-flex items-center justify-center
        rounded-md transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-1
        disabled:opacity-50 disabled:cursor-not-allowed
        ${buttonClasses[size]}
        ${variantClasses[variant]}
        ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
        >
            {title}
        </button>
    );
}
