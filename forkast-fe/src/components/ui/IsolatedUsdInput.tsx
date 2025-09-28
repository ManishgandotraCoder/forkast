'use client';

import React, { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';

interface IsolatedUsdInputProps {
    initialValue?: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
    placeholder?: string;
    min?: number;
    step?: number;
}

export interface IsolatedUsdInputRef {
    reset: () => void;
    focus: () => void;
}

const IsolatedUsdInput = forwardRef<IsolatedUsdInputRef, IsolatedUsdInputProps>(({
    initialValue = '',
    onValueChange,
    disabled = false,
    placeholder = "0.00",
    min = 0.01,
    step = 0.01
}, ref) => {
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef<HTMLInputElement>(null);
    const isFocused = useRef(false);
    const lastExternalValue = useRef(initialValue);

    // Only update from external changes when not focused
    useEffect(() => {
        if (lastExternalValue.current !== initialValue && !isFocused.current) {
            setValue(initialValue);
            lastExternalValue.current = initialValue;
        }
    }, [initialValue]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setValue(newValue);
        onValueChange(newValue);
    }, [onValueChange]);

    const handleFocus = useCallback(() => {
        isFocused.current = true;
    }, []);

    const handleBlur = useCallback(() => {
        isFocused.current = false;
        // Sync with external value on blur if it changed
        if (lastExternalValue.current !== initialValue) {
            setValue(initialValue);
            lastExternalValue.current = initialValue;
        }
    }, [initialValue]);

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
        reset: () => {
            setValue('');
            onValueChange('');
        },
        focus: () => {
            inputRef.current?.focus();
        }
    }), [onValueChange]);

    return (
        <div className="relative">
            <input
                ref={inputRef}
                type="number"
                inputMode="decimal"
                value={value}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={placeholder}
                min={min}
                step={step}
                disabled={disabled}
                aria-label="USD amount"
            />
            <div className="pointer-events-none absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 text-sm font-medium">
                USD
            </div>
        </div>
    );
});

IsolatedUsdInput.displayName = 'IsolatedUsdInput';

export default IsolatedUsdInput;
