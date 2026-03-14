// src/Auth.tsx
import { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isSent, setIsSent] = useState(false); // 【追加】メール送信完了フラグ
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      alert("メールアドレスとパスワードを入力してください");
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // 新規登録処理
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        // 成功したら「メール確認画面」へ切り替える
        setIsSent(true); 
      } else {
        // ログイン処理
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      alert(`エラー: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- 【追加】メール送信後の待機画面 ---
  if (isSent) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f8fafc' }}>
        <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '32px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '350px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✉️</div>
          <h2 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '16px', color: '#0f172a' }}>メールを確認してください</h2>
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6', marginBottom: '32px' }}>
            <b>{email}</b> 宛に確認リンクを送信しました。<br/><br/>
            メール内のリンクをクリックして、アカウント登録を完了させてください。
          </p>
          <button 
            onClick={() => { setIsSent(false); setIsSignUp(false); }}
            style={{ ...btnS, backgroundColor: '#f1f5f9', color: '#475569' }}
          >
            ログイン画面に戻る
          </button>
        </div>
      </div>
    );
  }

  // --- 通常のログイン・新規登録画面 ---
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f8fafc' }}>
      <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '32px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '350px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '28px', fontWeight: '950', marginBottom: '8px' }}>
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '32px' }}>
          {isSignUp ? '新しくアカウントを作成します' : '自分専用の就活管理ボードへ'}
        </p>
        
        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <label style={lS}>メールアドレス</label>
          <input 
            type="email" 
            placeholder="example@mail.com" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            style={iS} 
          />
          
          <label style={lS}>パスワード</label>
          <input 
            type="password" 
            placeholder="6文字以上" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            style={iS} 
          />

          <button type="submit" disabled={loading} style={btnS}>
            {loading ? '通信中...' : isSignUp ? '新規登録を実行' : 'ログイン'}
          </button>
        </form>

        <div style={{ marginTop: '24px' }}>
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {isSignUp ? 'すでにアカウントをお持ちの方（ログイン）' : '新しくアカウントを作る（新規登録）'}
          </button>
        </div>
      </div>
    </div>
  );
}

// スタイル定数
const lS = { fontSize: '11px', fontWeight: 'bold' as const, color: '#94a3b8', display: 'block', marginBottom: '4px', textTransform: 'uppercase' as const };
const iS = { width: '100%', padding: '12px', marginBottom: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxSizing: 'border-box' as const };
const btnS = { width: '100%', padding: '12px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold' as const, cursor: 'pointer', marginTop: '16px', transition: '0.2s' };