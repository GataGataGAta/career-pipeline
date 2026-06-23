const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_LOCAL_PATTERN = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/;
const DAY_MS = 1000 * 60 * 60 * 24;

const pad = (value: number) => value.toString().padStart(2, '0');

const startOfLocalDay = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const hasTimePart = (value: string) => {
  return value.includes('T') || /\d{1,2}:\d{2}/.test(value);
};

const formatTime = (date: Date) => {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

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

export const getLocalDateKey = (date: Date) => {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const getCalendarDayDiff = (deadline?: string | null, now = new Date()) => {
  const parsed = parseDeadline(deadline);
  if (!parsed) return null;

  return Math.round((startOfLocalDay(parsed).getTime() - startOfLocalDay(now).getTime()) / DAY_MS);
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

  if (!hasTimePart(value)) return dateLabel;
  return `${dateLabel} ${formatTime(parsed)}`;
};

export const formatRelativeDeadlineLabel = (deadline?: string | null, now = new Date()) => {
  const value = deadline?.trim();
  const parsed = parseDeadline(value);
  const dayDiff = getCalendarDayDiff(value, now);
  if (!value || !parsed || dayDiff === null) return null;

  const timeLabel = hasTimePart(value) ? ` ${formatTime(parsed)}` : '';

  if (dayDiff === 0) return `今日${timeLabel}`;
  if (dayDiff === 1) return `明日${timeLabel}`;
  if (dayDiff === 2) return `明後日${timeLabel}`;
  if (dayDiff > 2 && dayDiff <= 7) return `${dayDiff}日後${timeLabel}`;

  return null;
};
