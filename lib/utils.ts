import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: 'COP' | 'USD') {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'COP' ? 0 : 2,
    maximumFractionDigits: currency === 'COP' ? 0 : 2,
  }).format(amount);
}

export function formatDate(dateString: string | Date) {
  const date = new Date(dateString);
  // Para evitar que la fecha cambie por la zona horaria (offset), 
  // usamos UTC si el input es una cadena de fecha simple YYYY-MM-DD
  const options: Intl.DateTimeFormatOptions = {
    dateStyle: 'medium',
  };

  if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    options.timeZone = 'UTC';
  }

  return new Intl.DateTimeFormat('es-CO', options).format(date);
}
