
import React, { useState, useEffect } from 'react';
import { maskDateBR, parseDateBRToISO, formatDateBR } from '../utils/formatters';

interface Props {
    value: string; // ISO format: YYYY-MM-DD
    onChange: (value: string) => void;
    className?: string;
    placeholder?: string;
}

const DateInput: React.FC<Props> = ({ value, onChange, className, placeholder }) => {
    const [displayValue, setDisplayValue] = useState(formatDateBR(value));

    useEffect(() => {
        setDisplayValue(formatDateBR(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const masked = maskDateBR(e.target.value);
        setDisplayValue(masked);

        if (masked.length === 10) {
            const isoDate = parseDateBRToISO(masked);
            if (isoDate) {
                onChange(isoDate);
            }
        }
    };

    return (
        <input
            type="text"
            value={displayValue}
            onChange={handleChange}
            className={className}
            placeholder={placeholder || "DD/MM/AAAA"}
            maxLength={10}
        />
    );
};

export default DateInput;
