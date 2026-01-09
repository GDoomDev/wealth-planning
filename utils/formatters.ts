
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const parseCurrencyToNumber = (value: string): number => {
  const onlyDigits = value.replace(/\D/g, "");
  if (!onlyDigits) return 0;
  return parseInt(onlyDigits, 10) / 100;
};

export const maskCurrency = (value: string): string => {
  const onlyDigits = value.replace(/\D/g, "");
  if (!onlyDigits) return "R$ 0,00";
  const cents = parseInt(onlyDigits, 10);
  return formatCurrency(cents / 100);
};

export const formatDateBR = (isoDate: string): string => {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
};

export const maskDateBR = (value: string): string => {
  const onlyDigits = value.replace(/\D/g, "");
  let masked = onlyDigits;
  if (onlyDigits.length > 2) {
    masked = `${onlyDigits.slice(0, 2)}/${onlyDigits.slice(2)}`;
  }
  if (onlyDigits.length > 4) {
    masked = `${onlyDigits.slice(0, 2)}/${onlyDigits.slice(2, 4)}/${onlyDigits.slice(4, 8)}`;
  }
  return masked.slice(0, 10);
};

export const parseDateBRToISO = (brDate: string): string => {
  const parts = brDate.split('/');
  if (parts.length !== 3) return "";
  const [day, month, year] = parts;
  if (day.length !== 2 || month.length !== 2 || year.length !== 4) return "";
  return `${year}-${month}-${day}`;
};
