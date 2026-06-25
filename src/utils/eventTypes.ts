export type JobEventType = '締切' | '面接' | '説明会' | '返信期限' | 'その他';

export const DEFAULT_EVENT_TYPE: JobEventType = '締切';

export const EVENT_TYPES: JobEventType[] = ['締切', '面接', '説明会', '返信期限', 'その他'];

const EVENT_TYPE_COLORS: Record<JobEventType, { bg: string; text: string; border: string }> = {
  締切: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
  面接: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
  説明会: { bg: '#e0f2fe', text: '#075985', border: '#bae6fd' },
  返信期限: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  その他: { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' },
};

export const normalizeEventType = (value?: string | null): JobEventType => {
  return EVENT_TYPES.includes(value as JobEventType) ? value as JobEventType : DEFAULT_EVENT_TYPE;
};

export const getEventTypeColor = (value?: string | null) => {
  return EVENT_TYPE_COLORS[normalizeEventType(value)];
};
