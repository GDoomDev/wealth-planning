
import React, { useState, useEffect, useRef } from 'react';
import { maskDateBR, parseDateBRToISO, formatDateBR } from '../utils/formatters';
import { Calendar } from 'lucide-react';

interface Props {
    value: string; // ISO format: YYYY-MM-DD
    onChange: (value: string) => void;
    className?: string;
    placeholder?: string;
}

const DateInput: React.FC<Props> = ({ value, onChange, className, placeholder }) => {
    const [displayValue, setDisplayValue] = useState(formatDateBR(value));
    const dateInputRef = useRef<HTMLInputElement>(null);

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

    const handleCalendarClick = () => {
        if (dateInputRef.current) {
            try {
                // @ts-ignore - showPicker is a newer API
                if (dateInputRef.current.showPicker) {
                    dateInputRef.current.showPicker();
                } else {
                    dateInputRef.current.click();
                }
            } catch (e) {
                dateInputRef.current.click();
            }
        }
    };

    return (
        <div className="relative flex-1 group/date">
            <input
                type="text"
                value={displayValue}
                onChange={handleChange}
                className={`${className} pr-10`}
                placeholder={placeholder || "DD/MM/AAAA"}
                maxLength={10}
            />
            <button
                type="button"
                onClick={handleCalendarClick}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                tabIndex={-1}
            >
                <Calendar size={18} />
            </button>
            <input
                ref={dateInputRef}
                type="date"
                value={value}
                onChange={(e) => {
                    if (e.target.value) {
                        onChange(e.target.value);
                    }
                }}
                className="absolute bottom-0 right-0 opacity-0 pointer-events-none w-0 h-0"
                tabIndex={-1}
            />
        </div>
    );
};

export default DateInput;
