export function setLocalTime(date: Date, hours: number, minutes: number): Date {
  const next = new Date(date);
  next.setMinutes(minutes);
  next.setHours(hours);
  return next;
}

export function toDateInputValue(date: Date | undefined): string {
  if (!date) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromDateInputValue(
  value: string,
  hours: number,
  minutes: number,
): Date | undefined {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;

  const date = new Date(year, month - 1, day, hours, minutes);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined;
  }

  return date;
}

export function formatDateTime(
  date: Date,
  includeTime: boolean,
  locales?: Intl.LocalesArgument,
): string {
  return new Intl.DateTimeFormat(locales, {
    dateStyle: 'long',
    ...(includeTime ? { timeStyle: 'short' as const } : {}),
  }).format(date);
}
