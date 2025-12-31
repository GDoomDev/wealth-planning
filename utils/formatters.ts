
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
