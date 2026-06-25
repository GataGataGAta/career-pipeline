// src/components/Card.tsx
import { formatDeadlineLabel, formatRelativeDeadlineLabel, parseDeadline } from '../utils/deadline';
import { getEventTypeColor, normalizeEventType, type JobEventType } from '../utils/eventTypes';

type CardProps = {
  companyName: string;
  platform: string;
  status: string;
  eventType?: JobEventType | null;
  url?: string;
  deadline?: string;
  onDelete: () => void;
  onEdit: () => void;
  onArchive: () => void;
};

export const Card = ({ companyName, platform, status, eventType, url, deadline, onDelete, onEdit, onArchive }: CardProps) => {

  const getDeadlineStyle = () => {
    if (!deadline) return { color: '#64748b', text: '設定なし' };

    const deadlineDate = parseDeadline(deadline);
    const label = formatDeadlineLabel(deadline);
    const relativeLabel = formatRelativeDeadlineLabel(deadline);
    if (!deadlineDate) return { color: '#64748b', text: `📅 締切: ${label}` };

    const now = new Date();
    const diffMs = deadlineDate.getTime() - now.getTime();
    if (diffMs < 0) return { color: '#ef4444', text: `⚠️ 期限切れ (${label})` };

    const diffMinutes = Math.ceil(diffMs / (1000 * 60));
    if (diffMinutes <= 60) return { color: '#f97316', text: `⏳ あと${diffMinutes}分 (${label})` };

    if (relativeLabel) return { color: '#f97316', text: `⏳ ${relativeLabel} (${label})` };

    return { color: '#64748b', text: `📅 締切: ${label}` };
  };

  const getPlatformColors = (p: string) => {
    switch (p) {
      case 'LabBase': return { bg: '#dbeafe', text: '#1e3a8a', border: '#bfdbfe' };
      case 'OfferBox': return { bg: '#ffedd5', text: '#9a3412', border: '#fed7aa' };
      case 'アカリク': return { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' };
      case 'サポーターズ': return { bg: '#ccfbf1', text: '#115e59', border: '#99f6e4' };
      case 'リクナビ/マイナビ': return { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe' };
      case '直接応募': return { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' };
      default: return { bg: '#f3f4f6', text: '#4b5563', border: '#e5e7eb' };
    }
  };

  const dlStyle = getDeadlineStyle();
  const pColor = getPlatformColors(platform);
  const normalizedEventType = normalizeEventType(eventType);
  const eventColor = getEventTypeColor(normalizedEventType);

  return (
    <div style={{
      border: '1px solid #e5e7eb', borderRadius: '16px', padding: '20px',
      backgroundColor: '#ffffff', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
      width: '300px', position: 'relative',
      borderTop: `5px solid ${pColor.text}`, boxSizing: 'border-box',
      textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px'
    }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', width: '100%' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', minWidth: 0 }}>
          <button onClick={onEdit} style={btnStyle}>📝 メモ</button>
          {url && <a href={url} target="_blank" rel="noreferrer" style={linkStyle}>🌐 リンク</a>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end', minWidth: 0, maxWidth: '160px' }}>
          <span style={{
            backgroundColor: pColor.bg, color: pColor.text, border: `1px solid ${pColor.border}`,
            padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800',
            maxWidth: '100%', overflowWrap: 'anywhere', lineHeight: '1.4'
          }}>
            {platform || '未設定'}
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={onArchive} style={arcStyle} title="アーカイブ（隠す）">📦</button>
            <button onClick={onDelete} style={delStyle} title="完全に削除">🗑️</button>
          </div>
        </div>
      </div>

      {/* 企業名（中央） */}
      <h3 style={{ margin: '0', fontSize: '20px', fontWeight: '900', color: '#0f172a', wordBreak: 'break-word', overflowWrap: 'anywhere', lineHeight: '1.35', maxWidth: '100%' }}>
        {companyName}
      </h3>

      {/* 締切表示（中央） */}
      <div style={{ fontSize: '13px', color: dlStyle.color, fontWeight: 'bold', lineHeight: '1.5', overflowWrap: 'anywhere' }}>
        {dlStyle.text}
      </div>

      <div>
        <span style={{
          backgroundColor: eventColor.bg, color: eventColor.text, border: `1px solid ${eventColor.border}`,
          padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '800'
        }}>
          {normalizedEventType}
        </span>
      </div>

      {/* ステータスタグ（中央） */}
      <div>
        <span style={tagStyle}>{status}</span>
      </div>
    </div>
  );
};

// スタイル定数
const btnStyle = { border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '12px', borderRadius: '6px', padding: '4px 8px', fontWeight: 'bold' };
const linkStyle = { ...btnStyle, textDecoration: 'none', color: '#3b82f6' };
const arcStyle = { border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', cursor: 'pointer', borderRadius: '6px', padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const delStyle = { border: 'none', background: '#fee2e2', color: '#ef4444', cursor: 'pointer', borderRadius: '6px', padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const tagStyle = { backgroundColor: '#f1f5f9', color: '#475569', padding: '6px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', border: '1px solid #e2e8f0' };
