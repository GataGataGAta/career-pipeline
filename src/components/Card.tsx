// src/components/Card.tsx
type CardProps = {
  companyName: string;
  platform: string;
  status: string;
  url?: string;
  deadline?: string;
  onDelete: () => void;
  onEdit: () => void;
  onArchive: () => void;
};

export const Card = ({ companyName, platform, status, url, deadline, onDelete, onEdit, onArchive }: CardProps) => {
  
  const getDeadlineStyle = () => {
    if (!deadline) return { color: '#64748b', text: '設定なし' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dDate = new Date(deadline);
    const diffDays = Math.ceil((dDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { color: '#ef4444', text: `⚠️ 期限切れ (${deadline})` };
    if (diffDays <= 3) return { color: '#f97316', text: `⏳ あと${diffDays}日 (${deadline})` };
    return { color: '#64748b', text: `📅 締切: ${deadline}` };
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

  return (
    <div style={{
      border: '1px solid #e5e7eb', borderRadius: '16px', padding: '20px',
      backgroundColor: '#ffffff', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
      width: '300px', position: 'relative', 
      paddingTop: '56px', // 上部のボタンとタグのためのスペースを確保
      borderTop: `5px solid ${pColor.text}`, boxSizing: 'border-box',
      textAlign: 'center' // 全体を中央揃えにして画像のレイアウトに合わせる
    }}>
      
      {/* 左上のメモ・リンクボタン */}
      <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '8px' }}>
        <button onClick={onEdit} style={btnStyle}>📝 メモ</button>
        {url && <a href={url} target="_blank" rel="noreferrer" style={linkStyle}>🌐 リンク</a>}
      </div>
      
      {/* 【修正】右上に媒体タグ、アーカイブ、削除ボタンをまとめて配置 */}
      <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ 
          backgroundColor: pColor.bg, color: pColor.text, border: `1px solid ${pColor.border}`, 
          padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800',
          marginRight: '4px' // アイコンボタンとの間に少しだけ余白
        }}>
          {platform || '未設定'}
        </span>
        <button onClick={onArchive} style={arcStyle} title="アーカイブ（隠す）">📦</button>
        <button onClick={onDelete} style={delStyle} title="完全に削除">🗑️</button>
      </div>
      
      {/* 企業名（中央） */}
      <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '900', color: '#0f172a', wordBreak: 'break-word', lineHeight: '1.3' }}>
        {companyName}
      </h3>

      {/* 締切表示（中央） */}
      <div style={{ marginBottom: '20px', fontSize: '13px', color: dlStyle.color, fontWeight: 'bold' }}>
        {dlStyle.text}
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