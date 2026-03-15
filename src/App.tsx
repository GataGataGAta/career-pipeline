// src/App.tsx
import React, { useState, useEffect } from 'react';
import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ReactMarkdown from 'react-markdown';
import { supabase } from './supabaseClient';
import { Card } from './components/Card';
import Auth from './Auth';
import type { Session } from '@supabase/supabase-js';

interface JobCard {
  id: number;
  company_name: string;
  status: string;
  platform: string;
  memo: string;
  url: string | null;
  deadline: string | null;
  is_archived: boolean;
}

const PLATFORMS = ['LabBase', 'OfferBox', 'アカリク', 'サポーターズ', 'リクナビ/マイナビ', '直接応募', 'その他'];
const INITIAL_STAGES = ['スカウト・応募前', '書類選考', '1次面接', '最終面接', '内定'];

// --- ① ドラッグ用カード ---
function DraggableCard({ card, onDelete, onEdit, onArchive }: { card: JobCard; onDelete: (id: number) => void; onEdit: (card: JobCard) => void; onArchive: (id: number) => void; }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `card-${card.id}`, data: { type: 'card', card } });
  
  // スマホでのテキスト選択と長押しメニュー、スクロール干渉を完全に防ぐスタイル
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: transform ? 1000 : 1,
    cursor: transform ? 'grabbing' : 'grab',
    touchAction: 'none',
    WebkitUserSelect: 'none',
    userSelect: 'none',
    WebkitTouchCallout: 'none',
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Card 
        companyName={card.company_name} platform={card.platform} status={card.status} 
        url={card.url || undefined} deadline={card.deadline || undefined} 
        onDelete={() => onDelete(card.id)} onEdit={() => onEdit(card)} onArchive={() => onArchive(card.id)}
      />
    </div>
  );
}

// --- ② ソート可能カラム ---
function SortableColumn({ column, cards, onDeleteCard, onEditCard, onDeleteColumn, onArchiveCard }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `col-${column}`, data: { type: 'column', column }, disabled: cards.length > 0 });
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: column });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.5 : 1, backgroundColor: isOver ? '#f1f5f9' : '#fff',
    padding: '24px 16px', borderRadius: '24px', border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '20px'
  };

  return (
    <section ref={setNodeRef} style={style}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: cards.length === 0 ? 'grab' : 'default', flexWrap: 'wrap' }} {...(cards.length === 0 ? listeners : {})} {...attributes}>
          <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#1e293b', margin: 0 }}>{cards.length === 0 ? '⠿ ' : ''}{column}</h2>
          <span style={{ fontSize: '12px', background: '#3b82f6', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontWeight: '800' }}>{cards.length}</span>
        </div>
        {cards.length === 0 && <button onClick={() => onDeleteColumn(column)} style={{ border: 'none', background: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: '12px', flexShrink: 0 }}>削除 🗑️</button>}
      </div>
      <div ref={setDroppableRef} style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', minHeight: '80px', justifyContent: 'center' }}>
        {cards.map((c: JobCard) => <DraggableCard key={c.id} card={c} onDelete={onDeleteCard} onEdit={onEditCard} onArchive={onArchiveCard} />)}
      </div>
    </section>
  );
}

// --- ③ メインアプリ ---
export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [cards, setCards] = useState<JobCard[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [newCompany, setNewCompany] = useState('');
  const [newStatusName, setNewStatusName] = useState('');
  const [editingCard, setEditingCard] = useState<JobCard | null>(null);

  const [filterPlatform, setFilterPlatform] = useState<string>('All');
  const [showArchived, setShowArchived] = useState<boolean>(false);

  // スマホのドラッグをスムーズにするセンサー設定
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async (currentUserId: string) => {
    try {
      let { data: cols } = await supabase.from('job_columns').select('name').order('position');
      if (!cols || cols.length === 0) {
        const seedData = INITIAL_STAGES.map((name, index) => ({ name, position: index + 1, user_id: currentUserId }));
        await supabase.from('job_columns').insert(seedData);
        const { data: newCols } = await supabase.from('job_columns').select('name').order('position');
        cols = newCols;
      }
      if (cols) setColumns(cols.map((c: { name: string }) => c.name));

      const { data: crds } = await supabase.from('job_cards').select('*');
      if (crds) setCards(crds as JobCard[]);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => { if (session?.user?.id) fetchData(session.user.id); }, [session]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    if (active.data.current?.type === 'column' && active.id !== over.id) {
      const oldIndex = columns.indexOf(active.data.current.column);
      const newIndex = columns.indexOf((over.data.current as any).column);
      setColumns(arrayMove(columns, oldIndex, newIndex));
      return;
    }
    if (active.data.current?.type === 'card') {
      const draggedId = active.data.current.card.id;
      const overId = over.id.toString().replace('col-', '');
      if (columns.includes(overId)) {
        await supabase.from('job_cards').update({ status: overId }).eq('id', draggedId);
        setCards(cards.map((c: JobCard) => c.id === draggedId ? { ...c, status: overId } : c));
      }
    }
  };

  const addCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany || columns.length === 0 || !session) return;
    const newCard: JobCard = { 
      id: Date.now(), company_name: newCompany, status: columns[0], 
      platform: filterPlatform !== 'All' ? filterPlatform : 'LabBase', 
      memo: '', url: '', deadline: '', is_archived: false,
      // @ts-ignore
      user_id: session.user.id 
    };
    const { error } = await supabase.from('job_cards').insert([newCard]);
    if (!error) { setCards([...cards, newCard]); setNewCompany(''); }
  };

  const addColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatusName || columns.includes(newStatusName) || !session) return;
    const { error } = await supabase.from('job_columns').insert([{ name: newStatusName, position: columns.length + 1, user_id: session.user.id }]);
    if (!error) { setColumns([...columns, newStatusName]); setNewStatusName(''); }
  };

  const handleLocalEdit = (key: keyof JobCard, value: string | boolean) => {
    if (!editingCard) return;
    setEditingCard({ ...editingCard, [key]: value });
  };

  const saveEdits = async () => {
    if (!editingCard) return;
    const { error } = await supabase.from('job_cards').update({
      company_name: editingCard.company_name, platform: editingCard.platform,
      url: editingCard.url, deadline: editingCard.deadline, memo: editingCard.memo, is_archived: editingCard.is_archived
    }).eq('id', editingCard.id);

    if (!error) {
      setCards(cards.map((c) => (c.id === editingCard.id ? editingCard : c)));
      setEditingCard(null);
    }
  };

  const archiveCard = async (id: number) => {
    const target = cards.find(c => c.id === id);
    const actionText = target?.is_archived ? "元に戻しますか？" : "アーカイブ（一覧から非表示）にしますか？";
    if (window.confirm(`${target?.company_name} を${actionText}`)) {
      const { error } = await supabase.from('job_cards').update({ is_archived: !target?.is_archived }).eq('id', id);
      if (!error) {
        setCards(cards.map((c) => c.id === id ? { ...c, is_archived: !c.is_archived } : c));
      }
    }
  };

  if (!session) return <Auth />;

  const visibleCards = cards.filter(c => {
    if (showArchived ? !c.is_archived : c.is_archived) return false;
    if (filterPlatform !== 'All' && c.platform !== filterPlatform) return false;
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', paddingBottom: '100px', overflowX: 'hidden', color: '#0f172a' }}>
      
      <div style={{ position: 'fixed', top: '12px', right: '12px', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 100, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '80%' }}>
        <span style={{ fontSize: '10px', color: '#64748b', backgroundColor: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>
          👤 {session.user.email}
        </span>
        <button onClick={() => supabase.auth.signOut()} style={{ padding: '6px 12px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>ログアウト</button>
      </div>

      <header style={{ backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', padding: '60px 20px 30px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '950', marginBottom: '24px', wordBreak: 'break-word', color: '#0f172a' }}>Career <span style={{ color: '#3b82f6' }}>Pipeline</span></h1>
        
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
          <select 
            value={filterPlatform} 
            onChange={(e) => setFilterPlatform(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: 'bold', outline: 'none', fontSize: '13px', width: '100%', maxWidth: '200px', backgroundColor: '#fff', color: '#0f172a' }}
          >
            <option value="All">すべての媒体</option>
            {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <button 
            onClick={() => setShowArchived(!showArchived)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: showArchived ? '#3b82f6' : '#fff', color: showArchived ? '#fff' : '#0f172a', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', width: '100%', maxWidth: '200px' }}
          >
            {showArchived ? '📂 アーカイブ表示中' : '📦 アーカイブを見る'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
          <form onSubmit={addCard} style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <input value={newCompany} onChange={(e) => setNewCompany(e.target.value)} placeholder="企業を追加..." style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', flex: 1, minWidth: 0, backgroundColor: '#fff', color: '#0f172a' }} />
            <button type="submit" style={{ padding: '0 20px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>追加</button>
          </form>
          <form onSubmit={addColumn} style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <input value={newStatusName} onChange={(e) => setNewStatusName(e.target.value)} placeholder="新しいステップ..." style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', flex: 1, minWidth: 0, backgroundColor: '#fff', color: '#0f172a' }} />
            <button type="submit" style={{ padding: '0 12px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}>ステップ追加</button>
          </form>
        </div>
      </header>

      {showArchived && (
        <div style={{ backgroundColor: '#eff6ff', color: '#1e3a8a', padding: '12px', textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid #bfdbfe', fontSize: '12px' }}>
          現在アーカイブの企業のみを表示中。<br/>カード右上の「📦」を押すと戻ります。
        </div>
      )}

      <main style={{ maxWidth: '1100px', margin: '30px auto', padding: '0 16px' }}>
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={columns.map(c => `col-${c}`)} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {columns.map(col => (
                <SortableColumn 
                  key={col} column={col} 
                  cards={visibleCards.filter((c: JobCard) => c.status === col).sort((a: JobCard, b: JobCard) => {
                    if (!a.deadline) return 1; if (!b.deadline) return -1;
                    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
                  })} 
                  onDeleteCard={async (id: number) => {
                    const target = cards.find(c => c.id === id);
                    if (window.confirm(`${target?.company_name || 'この企業'} を完全に削除しますか？`)) {
                      await supabase.from('job_cards').delete().eq('id', id);
                      setCards(cards.filter(c => c.id !== id));
                    }
                  }} 
                  onEditCard={setEditingCard} onArchiveCard={archiveCard} 
                  onDeleteColumn={async (name: string) => {
                    if (window.confirm(`${name} ステップを削除しますか？`)) {
                      await supabase.from('job_columns').delete().eq('name', name);
                      setColumns(columns.filter(c => c !== name));
                    }
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </main>

      {/* 編集モーダル */}
      {editingCard && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '24px', width: '95%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h2 style={{ margin: 0, fontWeight: '900', fontSize: '20px', wordBreak: 'break-word', color: '#0f172a' }}>編集: {editingCard.company_name}</h2>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: '#64748b', cursor: 'pointer' }}>
                  <input type="checkbox" checked={editingCard.is_archived} onChange={(e) => handleLocalEdit('is_archived', e.target.checked)} />
                  アーカイブ済みにする
                </label>
              </div>
              <button onClick={saveEdits} style={{ padding: '10px 24px', background: '#3b82f6', color: '#fff', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold', width: '100%', maxWidth: '200px' }}>保存して閉じる</button>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
              <div style={{ flex: '1 1 100%' }}><label style={lS}>企業名</label><input value={editingCard.company_name} onChange={(e) => handleLocalEdit('company_name', e.target.value)} style={iS} /></div>
              <div style={{ flex: '1 1 100%' }}><label style={lS}>媒体</label>
                <select value={editingCard.platform} onChange={(e) => handleLocalEdit('platform', e.target.value)} style={iS}>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div style={{ flex: '1 1 100%' }}><label style={lS}>URL</label><input value={editingCard.url || ''} onChange={(e) => handleLocalEdit('url', e.target.value)} style={iS} /></div>
              <div style={{ flex: '1 1 100%' }}><label style={lS}>締切</label><input type="date" value={editingCard.deadline || ''} onChange={(e) => handleLocalEdit('deadline', e.target.value)} style={iS} /></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
              <textarea value={editingCard.memo} onChange={(e) => handleLocalEdit('memo', e.target.value)} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#0f172a', resize: 'vertical', minHeight: '150px', fontSize: '14px', lineHeight: '1.6', boxSizing: 'border-box' }} />
              <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '16px', overflowY: 'auto', minHeight: '100px', fontSize: '14px', boxSizing: 'border-box', backgroundColor: '#fff', color: '#0f172a' }}><ReactMarkdown>{editingCard.memo || "*メモは空です*"}</ReactMarkdown></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const lS = { fontSize: '11px', fontWeight: 'bold' as const, color: '#94a3b8', display: 'block', marginBottom: '4px', textTransform: 'uppercase' as const };
const iS = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' as const, backgroundColor: '#fff', color: '#0f172a' };