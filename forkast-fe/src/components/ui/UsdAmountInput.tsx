'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface UsdAmountInputProps {
    value: string;
    onChange: (value: string) => void;
    disabled: boolean;
    placeholder?: string;
    min?: number;
    step?: number;
}

const UsdAmountInput = React.memo(({
    value,
    onChange,
    disabled,
    placeholder = "0.00",
    min = 0.01,
    step = 0.01
}: UsdAmountInputProps) => {
    const [localValue, setLocalValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);
    const isFocused = useRef(false);
    const lastPropValue = useRef(value);

    // Only sync when the prop value actually changes and we're not focused
    useEffect(() => {
        if (lastPropValue.current !== value && !isFocused.current) {
            setLocalValue(value);
            lastPropValue.current = value;
        }
    }, [value]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        onChange(newValue);
    }, [onChange]);

    const handleFocus = useCallback(() => {
        isFocused.current = true;
    }, []);

    const handleBlur = useCallback(() => {
        isFocused.current = false;
        // Sync with parent value on blur if it changed
        if (lastPropValue.current !== value) {
            setLocalValue(value);
            lastPropValue.current = value;
        }
    }, [value]);

    // Prevent unnecessary re-renders by using a stable onChange reference
    const stableOnChange = useCallback((newValue: string) => {
        onChange(newValue);
    }, [onChange]);

    return (
        <div className="relative">
            <input
                ref={inputRef}
                type="number"
                inputMode="decimal"
                value={localValue}
                onChange={(e) => {
                    const newValue = e.target.value;
                    setLocalValue(newValue);
                    stableOnChange(newValue);
                }}
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

UsdAmountInput.displayName = 'UsdAmountInput';

export default UsdAmountInput;
