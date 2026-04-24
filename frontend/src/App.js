import React, { useState, useRef, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Menu, Edit3, Plus, Mic, ArrowUp, MoreHorizontal, Copy, RefreshCw, Check, Pin, Archive, Trash2, FolderPlus, Edit2, Sparkles, Code, Pencil, Heart, BarChart3 } from 'lucide-react';
import './App.css';

function App() {
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('general');
  const [conversations, setConversations] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' });
}, [messages]);useEffect(() => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}, [theme]);
  const endRef = useRef(null);

  const API_URL = 'https://zenithgpt-backend.onrender.com';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    const closeMenu = () => setMenuOpenId(null);
    if (menuOpenId) {
      document.addEventListener('click', closeMenu);
      return () => document.removeEventListener('click', closeMenu);
    }
  }, [menuOpenId]);

  const loadConversations = async () => {
    try {
      const r = await fetch(API_URL + '/conversations');
      const d = await r.json();
      setConversations(d.conversations || []);
    } catch (e) {}
  };

  const saveChat = async (msgs) => {
    if (msgs.length === 0) return;
    const found = conversations.find(c => c.id === currentId);
    const title = currentId && found ? found.title : msgs[0].content.substring(0, 40);
    try {
      const r = await fetch(API_URL + '/save-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: currentId, title: title, messages: msgs, mode: mode })
      });
      const d = await r.json();
      if (d.success && d.data && d.data[0]) setCurrentId(d.data[0].id);
      loadConversations();
    } catch (e) {}
  };

  const sendMessage = async (customInput) => {
    const messageText = customInput || input;
    if (!messageText.trim() || loading) return;
    const userMsg = { role: 'user', content: messageText };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput('');
    setLoading(true);
    try {
      const r = await fetch(API_URL + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, mode: mode, history: messages })
      });
      const d = await r.json();
      if (d.error) {
        setMessages([...newMsgs, { role: 'assistant', content: 'Error: ' + d.error }]);
      } else {
        const final = [...newMsgs, { role: 'assistant', content: d.reply }];
        setMessages(final);
        saveChat(final);
      }
    } catch (e) {
      setMessages([...newMsgs, { role: 'assistant', content: 'Connection error.' }]);
    } finally {
      setLoading(false);
    }
  };

  const regenerateResponse = async () => {
    if (messages.length < 2 || loading) return;
    const withoutLast = messages.slice(0, -1);
    const lastUser = withoutLast[withoutLast.length - 1];
    if (lastUser.role !== 'user') return;
    setMessages(withoutLast);
    setLoading(true);
    try {
      const r = await fetch(API_URL + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: lastUser.content, mode: mode, history: withoutLast.slice(0, -1) })
      });
      const d = await r.json();
      if (d.reply) {
        const final = [...withoutLast, { role: 'assistant', content: d.reply }];
        setMessages(final);
        saveChat(final);
      }
    } catch (e) {}
    setLoading(false);
  };

  const copyMessage = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const renameChat = async (id) => {
    const newTitle = window.prompt('Rename chat:');
    if (!newTitle) return;
    await fetch(API_URL + '/conversations/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle })
    });
    loadConversations();
  };

  const pinChat = async (id, currentPinned) => {
    await fetch(API_URL + '/conversations/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !currentPinned })
    });
    loadConversations();
  };

  const archiveChat = async (id) => {
    await fetch(API_URL + '/conversations/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: true })
    });
    if (currentId === id) { setMessages([]); setCurrentId(null); }
    loadConversations();
  };

  const deleteChat = async (id) => {
    if (!window.confirm('Delete this chat?')) return;
    await fetch(API_URL + '/conversations/' + id, { method: 'DELETE' });
    if (currentId === id) { setMessages([]); setCurrentId(null); }
    loadConversations();
  };

  const suggestions = [
    { icon: <Sparkles size={18} />, title: 'Brainstorm ideas', text: 'for a weekend project' },
    { icon: <Code size={18} />, title: 'Write code', text: 'to parse a CSV file' },
    { icon: <Pencil size={18} />, title: 'Help me write', text: 'a professional email' },
    { icon: <Heart size={18} />, title: 'Give me advice', text: 'on healthy habits' }
  ];

  if (!session) return <Auth />;

  return (
    <div className="app">
      {sidebarOpen && (
        <div className="sidebar">
          <div className="sidebar-top">
            <button className="icon-btn" onClick={() => setSidebarOpen(false)}><Menu size={20} /></button>
            <button className="icon-btn" onClick={() => { setMessages([]); setCurrentId(null); }}><Edit3 size={18} /></button>
          </div>
          <button className="new-chat-btn" onClick={() => { setMessages([]); setCurrentId(null); }}>
            <Plus size={16} /> New chat
          </button>
          <div className="modes">
            <p className="section-label">MODES</p>
            <button className={mode === 'general' ? 'mode-btn active' : 'mode-btn'} onClick={() => setMode('general')}><Sparkles size={16} /> General</button>
            <button className={mode === 'health' ? 'mode-btn active' : 'mode-btn'} onClick={() => setMode('health')}><Heart size={16} /> Health AI</button>
            <button className={mode === 'code' ? 'mode-btn active' : 'mode-btn'} onClick={() => setMode('code')}><Code size={16} /> Code AI</button>
            <button className={mode === 'writing' ? 'mode-btn active' : 'mode-btn'} onClick={() => setMode('writing')}><Pencil size={16} /> Writing AI</button>
            <button className={mode === 'data' ? 'mode-btn active' : 'mode-btn'} onClick={() => setMode('data')}><BarChart3 size={16} /> Data AI</button>
          </div>
          {conversations.length > 0 && (
            <div className="history">
              <p className="section-label">CHATS</p>
              {conversations.map(c => (
                <div key={c.id} className={currentId === c.id ? 'chat-item active' : 'chat-item'}>
                  <button className="chat-title-btn" onClick={() => { setMessages(c.messages); setCurrentId(c.id); setMode(c.mode || 'general'); }}>
                    {c.pinned && <Pin size={12} className="pin-icon" />}
                    <span className="chat-title-text">{c.title}</span>
                  </button>
                  <button className="menu-dots" onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === c.id ? null : c.id); }}>
                    <MoreHorizontal size={16} />
                  </button>
                  {menuOpenId === c.id && (
                    <div className="chat-menu" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => { renameChat(c.id); setMenuOpenId(null); }}><Edit2 size={14} /> Rename</button>
                      <button onClick={() => { alert('Projects coming soon!'); setMenuOpenId(null); }}><FolderPlus size={14} /> Move to project</button>
                      <button onClick={() => { pinChat(c.id, c.pinned); setMenuOpenId(null); }}><Pin size={14} /> {c.pinned ? 'Unpin' : 'Pin chat'}</button>
                      <button onClick={() => { archiveChat(c.id); setMenuOpenId(null); }}><Archive size={14} /> Archive</button>
                      <button className="menu-delete" onClick={() => { deleteChat(c.id); setMenuOpenId(null); }}><Trash2 size={14} /> Delete</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="profile">
            <div className="avatar">{session?.user?.email?.[0]?.toUpperCase() || 'U'}</div>
            <div className="profile-info">
              <p>{session?.user?.email?.split('@')[0] || 'User'}</p>
              <button onClick={() => supabase.auth.signOut()} className="logout-btn">Log out</button>
            </div>
          </div>
        </div>
      )}
      <div className="main">
        <div className="top-bar">
          {!sidebarOpen && <button className="icon-btn" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>}
          <div className="app-title">ZenithGPT</div>
          <div className="top-right">
            <button className="icon-btn" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <div className="avatar-small">{session?.user?.email?.[0]?.toUpperCase() || 'U'}</div>
          </div>
        </div>
        </div>
        <div className="chat-container">
          {messages.length === 0 ? (
            <div className="welcome">
              <h1>What can I help with?</h1>
              <div className="suggestions">
                {suggestions.map((s, i) => (
                  <button key={i} className="suggestion-card" onClick={() => sendMessage(s.title + ' ' + s.text)}>
                    <div className="suggestion-icon">{s.icon}</div>
                    <div className="suggestion-content">
                      <div className="suggestion-title">{s.title}</div>
                      <div className="suggestion-text">{s.text}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages-wrapper">
              {messages.map((m, i) => (
                <div key={i} className={'message-row ' + m.role}>
                  <div className="message-avatar">
                    {m.role === 'user' ? (session?.user?.email?.[0]?.toUpperCase() || 'U') : 'Z'}
                  </div>
                  <div className="message-content">
                    {m.role === 'assistant' ? (
                      <div className="markdown-body">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({ node, inline, className, children, ...props }) {
                              const match = /language-(\w+)/.exec(className || '');
                              return !inline && match ? (
                                <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" {...props}>
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              ) : (
                                <code className={className} {...props}>{children}</code>
                              );
                            }
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="user-text">{m.content}</div>
                    )}
                    {m.role === 'assistant' && !loading && (
                      <div className="message-actions">
                        <button onClick={() => copyMessage(m.content, i)} title="Copy">
                          {copiedIdx === i ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                        {i === messages.length - 1 && (
                          <button onClick={regenerateResponse} title="Regenerate">
                            <RefreshCw size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="message-row assistant">
                  <div className="message-avatar">Z</div>
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>

        <div className="input-wrapper">
          <div className="input-pill">
            <button className="plus-btn"><Plus size={18} /></button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask anything"
              disabled={loading}
            />
            <button className="mic-btn"><Mic size={18} /></button>
            <button className="send-btn" onClick={() => sendMessage()} disabled={loading || !input.trim()}>
              <ArrowUp size={16} />
            </button>
          </div>
          <p className="footer-text">ZenithGPT can make mistakes. Check important info.</p>
        </div>
      </div>
    </div>
  );
}

export default App;
