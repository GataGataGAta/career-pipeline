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

// 【修正】is_archived を追加
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
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 1000, cursor: 'grabbing' } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Card 
        companyName={card.company_name} platform={card.platform} status={card.status} 
        url={card.url || undefined} deadline={card.deadline || undefined} 
        onDelete={() => onDelete(card.id)} onEdit={() => onEdit(card)} onArchive={() => onArchive(card.id)} // 【追加】
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
    padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '20px'
  };

  return (
    <section ref={setNodeRef} style={style}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: cards.length === 0 ? 'grab' : 'default' }} {...(cards.length === 0 ? listeners : {})} {...attributes}>
          <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#1e293b', margin: 0 }}>{cards.length === 0 ? '⠿ ' : ''}{column}</h2>
          <span style={{ fontSize: '13px', background: '#3b82f6', color: '#fff', padding: '4px 14px', borderRadius: '20px', fontWeight: '800' }}>{cards.length}</span>
        </div>
        {cards.length === 0 && <button onClick={() => onDeleteColumn(column)} style={{ border: 'none', background: 'none', color: '#cbd5e1', cursor: 'pointer' }}>削除 🗑️</button>}
      </div>
      <div ref={setDroppableRef} style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', minHeight: '80px' }}>
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
  const [loading, setLoading] = useState(true);

  // 【追加】フィルターとアーカイブ表示用のState
  const [filterPlatform, setFilterPlatform] = useState<string>('All');
  const [showArchived, setShowArchived] = useState<boolean>(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async (currentUserId: string) => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
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

  // 【追加】アーカイブ機能
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

  // 【追加】表示するカードを「フィルター」と「アーカイブ状態」で絞り込む
  const visibleCards = cards.filter(c => {
    // アーカイブ表示モードならアーカイブ済みのみ、通常モードなら未アーカイブのみ表示
    if (showArchived ? !c.is_archived : c.is_archived) return false;
    // 媒体フィルター
    if (filterPlatform !== 'All' && c.platform !== filterPlatform) return false;
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', paddingBottom: '100px' }}>
      <div style={{ position: 'fixed', top: '20px', right: '20px', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 100 }}>
        <span style={{ fontSize: '12px', color: '#64748b', backgroundColor: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: '600' }}>👤 {session.user.email}</span>
        <button onClick={() => supabase.auth.signOut()} style={{ padding: '8px 16px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>ログアウト</button>
      </div>

      <header style={{ backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', padding: '40px 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '42px', fontWeight: '950', marginBottom: '32px' }}>Career <span style={{ color: '#3b82f6' }}>Pipeline</span></h1>
        
        {/* 【追加】フィルターとアーカイブ切り替えUI */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '24px' }}>
          <select 
            value={filterPlatform} 
            onChange={(e) => setFilterPlatform(e.target.value)}
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: 'bold', outline: 'none' }}
          >
            <option value="All">すべての媒体</option>
            {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <button 
            onClick={() => setShowArchived(!showArchived)}
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: showArchived ? '#3b82f6' : '#fff', color: showArchived ? '#fff' : '#0f172a', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {showArchived ? '📂 アーカイブ表示中' : '📦 アーカイブを見る'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          <form onSubmit={addCard} style={{ display: 'flex', gap: '12px' }}>
            <input value={newCompany} onChange={(e) => setNewCompany(e.target.value)} placeholder="企業を追加..." style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', width: '300px' }} />
            <button type="submit" style={{ padding: '0 24px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>追加</button>
          </form>
          <form onSubmit={addColumn} style={{ display: 'flex', gap: '12px' }}>
            <input value={newStatusName} onChange={(e) => setNewStatusName(e.target.value)} placeholder="新しいステップ..." style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '300px' }} />
            <button type="submit" style={{ padding: '0 16px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>ステップ追加</button>
          </form>
        </div>
      </header>

      {/* アーカイブモード中の警告 */}
      {showArchived && (
        <div style={{ backgroundColor: '#eff6ff', color: '#1e3a8a', padding: '12px', textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid #bfdbfe' }}>
          現在アーカイブ（非表示）の企業のみを表示しています。カード右上の「📦」を押すと元のリストに戻ります。
        </div>
      )}

      <main style={{ maxWidth: '1100px', margin: '40px auto', padding: '0 20px' }}>
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={columns.map(c => `col-${c}`)} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
              {columns.map(col => (
                <SortableColumn 
                  key={col} column={col} 
                  cards={visibleCards.filter((c: JobCard) => c.status === col).sort((a: JobCard, b: JobCard) => {
                    if (!a.deadline) return 1; if (!b.deadline) return -1;
                    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
                  })} 
                  onDeleteCard={async (id: number) => {
                    const target = cards.find(c => c.id === id);
                    if (window.confirm(`${target?.company_name || 'この企業'} の企業情報を完全に削除しますか？`)) {
                      await supabase.from('job_cards').delete().eq('id', id);
                      setCards(cards.filter(c => c.id !== id));
                    }
                  }} 
                  onEditCard={setEditingCard}
                  onArchiveCard={archiveCard} // 【追加】
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
          <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '32px', width: '92%', maxWidth: '1000px', height: '88vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h2 style={{ margin: 0, fontWeight: '900' }}>編集: {editingCard.company_name}</h2>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 'bold', color: '#64748b', cursor: 'pointer' }}>
                  <input type="checkbox" checked={editingCard.is_archived} onChange={(e) => handleLocalEdit('is_archived', e.target.checked)} />
                  アーカイブ済みにする
                </label>
              </div>
              <button onClick={saveEdits} style={{ padding: '12px 32px', background: '#3b82f6', color: '#fff', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>保存して閉じる</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
              <div style={{ flex: 1, minWidth: '200px' }}><label style={lS}>企業名</label><input value={editingCard.company_name} onChange={(e) => handleLocalEdit('company_name', e.target.value)} style={iS} /></div>
              <div style={{ flex: 1, minWidth: '200px' }}><label style={lS}>媒体</label>
                <select value={editingCard.platform} onChange={(e) => handleLocalEdit('platform', e.target.value)} style={iS}>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}><label style={lS}>URL</label><input value={editingCard.url || ''} onChange={(e) => handleLocalEdit('url', e.target.value)} style={iS} /></div>
              <div style={{ flex: 1, minWidth: '200px' }}><label style={lS}>締切</label><input type="date" value={editingCard.deadline || ''} onChange={(e) => handleLocalEdit('deadline', e.target.value)} style={iS} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', flex: 1, overflow: 'hidden' }}>
              <textarea value={editingCard.memo} onChange={(e) => handleLocalEdit('memo', e.target.value)} style={{ padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', resize: 'none', fontSize: '16px', lineHeight: '1.6' }} />
              <div style={{ padding: '24px', border: '1px solid #e2e8f0', borderRadius: '20px', overflowY: 'auto' }}><ReactMarkdown>{editingCard.memo || "*メモは空です*"}</ReactMarkdown></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const lS = { fontSize: '11px', fontWeight: 'bold' as const, color: '#94a3b8', display: 'block', marginBottom: '4px', textTransform: 'uppercase' as const };
const iS = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' as const };