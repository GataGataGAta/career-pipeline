const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_LOCAL_PATTERN = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/;

const pad = (value: number) => value.toString().padStart(2, '0');

export const parseDeadline = (deadline?: string | null) => {
  const value = deadline?.trim();
  if (!value) return null;

  if (DATE_ONLY_PATTERN.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day, 23, 59, 59, 999);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const toDeadlineTimestamp = (deadline?: string | null) => {
  return parseDeadline(deadline)?.getTime() ?? Number.POSITIVE_INFINITY;
};

export const toDatetimeLocalValue = (deadline?: string | null) => {
  const value = deadline?.trim();
  if (!value) return '';

  if (DATE_ONLY_PATTERN.test(value)) return `${value}T00:00`;

  const localMatch = value.match(DATETIME_LOCAL_PATTERN);
  if (localMatch) return localMatch[1];

  const parsed = parseDeadline(value);
  if (!parsed) return '';

  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
};

export const formatDeadlineLabel = (deadline?: string | null) => {
  const value = deadline?.trim();
  if (!value) return '設定なし';

  const parsed = parseDeadline(value);
  if (!parsed) return value;

  const dateLabel = `${parsed.getFullYear()}/${pad(parsed.getMonth() + 1)}/${pad(parsed.getDate())}`;
  const hasTime = value.includes('T') || /\d{1,2}:\d{2}/.test(value);

  if (!hasTime) return dateLabel;
  return `${dateLabel} ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
};
