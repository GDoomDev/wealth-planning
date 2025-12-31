import React from 'react';
import { maskCurrency, parseCurrencyToNumber } from '../utils/formatters';

interface Props {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

const CurrencyInput: React.FC<Props> = ({ value, onChange, className, placeholder, autoFocus }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // A máscara agora trata a string de entrada de forma robusta
    const maskedValue = maskCurrency(e.target.value);
    const numericValue = parseCurrencyToNumber(maskedValue);
    onChange(numericValue);
  };

  // Importante: Arredondamos para centavos antes de converter para string
  // para evitar que 11499.999999999993 vire "11499999999999993" na máscara
  const displayValue = value === 0 ? "" : maskCurrency(Math.round(value * 100).toString());

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      className={className}
      placeholder={placeholder || "R$ 0,00"}
      autoFocus={autoFocus}
    />
  );
};

export default CurrencyInput;