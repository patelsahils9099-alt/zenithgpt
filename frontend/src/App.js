import React, { useState, useRef, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import Privacy from './Privacy';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Menu, Plus, Mic, MicOff, ArrowUp, MoreHorizontal, Copy, RefreshCw, Check, Pin, Archive, Trash2, FolderPlus, Edit2, Sparkles, Code, Pencil, Heart, BarChart3, X, FileText, Camera, Image as ImageIcon, Paperclip, Settings as SettingsIcon, Shield, Download, LogOut, ChevronUp, Sun, Moon } from 'lucide-react';
import { extractAny } from './extractors';
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
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [userPhoto, setUserPhoto] = useState(null);
  const endRef = useRef(null);
  const cameraInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const micBaseRef = useRef('');
  const avatarInputRef = useRef(null);

  const MAX_FILE_BYTES = 10 * 1024 * 1024;
  const TEXT_EXTENSIONS = ['txt', 'md', 'json', 'csv', 'tsv', 'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'go', 'rs', 'rb', 'php', 'html', 'htm', 'css', 'scss', 'sass', 'sh', 'bash', 'zsh', 'yml', 'yaml', 'xml', 'sql', 'ini', 'toml', 'env', 'log', 'r', 'kt', 'swift', 'dart', 'lua', 'pl', 'vue', 'svelte'];

  const readAsText = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
  const readAsDataURL = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleFiles = async (files) => {
    const arr = Array.from(files);
    const next = [];
    for (const f of arr) {
      if (f.size > MAX_FILE_BYTES) {
        alert(`${f.name} is too large (max 10 MB).`);
        continue;
      }
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      const isImage = f.type.startsWith('image/');
      const looksLikeText = f.type.startsWith('text/') || TEXT_EXTENSIONS.includes(ext);
      try {
        if (isImage) {
          const data = await readAsDataURL(f);
          next.push({ type: 'image', name: f.name, data });
        } else if (looksLikeText) {
          const data = await readAsText(f);
          next.push({ type: 'text', name: f.name, data });
        } else {
          const extracted = await extractAny(f).catch(() => null);
          if (extracted && extracted.trim()) {
            next.push({ type: 'text', name: f.name, data: extracted });
          } else {
            const data = await readAsDataURL(f);
            next.push({ type: 'file', name: f.name, data });
          }
        }
      } catch {
        alert(`Could not read ${f.name}.`);
      }
    }
    if (next.length) setAttachments((prev) => [...prev, ...next]);
  };

  const removeAttachment = (i) => setAttachments((prev) => prev.filter((_, idx) => idx !== i));

  const openAttach = (which) => {
    setAttachMenuOpen(false);
    const ref = which === 'camera' ? cameraInputRef : which === 'photo' ? photoInputRef : fileInputRef;
    ref.current?.click();
  };

  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('Voice input is not supported in this browser. Try Chrome on desktop or Android.');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    micBaseRef.current = input ? input + ' ' : '';
    recognition.onresult = (event) => {
      let txt = '';
      for (let i = 0; i < event.results.length; i++) {
        txt += event.results[i][0].transcript;
      }
      setInput(micBaseRef.current + txt);
    };
    recognition.onerror = (e) => {
      setIsListening(false);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        alert('Microphone permission was denied. Allow it in your browser settings to use voice input.');
      }
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch (e) {
      setIsListening(false);
    }
  };

  const API_URL = 'https://zenithgpt-backend.onrender.com';

  const authHeaders = (extra = {}) => {
    const token = session?.access_token;
    return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (session) loadConversations();
    if (session?.user?.id) {
      const saved = localStorage.getItem('userPhoto:' + session.user.id);
      setUserPhoto(saved || null);
    } else {
      setUserPhoto(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please choose an image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Profile photo must be under 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setUserPhoto(dataUrl);
      if (session?.user?.id) {
        try { localStorage.setItem('userPhoto:' + session.user.id, dataUrl); } catch {}
      }
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    setUserPhoto(null);
    if (session?.user?.id) localStorage.removeItem('userPhoto:' + session.user.id);
  };

  useEffect(() => {
    const closeMenu = () => setMenuOpenId(null);
    if (menuOpenId) {
      document.addEventListener('click', closeMenu);
      return () => document.removeEventListener('click', closeMenu);
    }
  }, [menuOpenId]);

  useEffect(() => {
    const close = () => setAttachMenuOpen(false);
    if (attachMenuOpen) {
      document.addEventListener('click', close);
      return () => document.removeEventListener('click', close);
    }
  }, [attachMenuOpen]);

  useEffect(() => {
    const close = () => setShowProfileMenu(false);
    if (showProfileMenu) {
      document.addEventListener('click', close);
      return () => document.removeEventListener('click', close);
    }
  }, [showProfileMenu]);

  const loadConversations = async () => {
    if (!session?.access_token) return;
    try {
      const r = await fetch(API_URL + '/conversations', { headers: authHeaders() });
      const d = await r.json();
      if (!r.ok) {
        console.error('Failed to load conversations:', r.status, d?.detail || d);
        return;
      }
      setConversations(d.conversations || []);
    } catch (e) {
      console.error('Failed to load conversations:', e);
    }
  };

  const saveChat = async (msgs, convId) => {
    if (msgs.length === 0) return null;
    const found = conversations.find(c => c.id === convId);
    const title = convId && found ? found.title : msgs[0].content.substring(0, 40);
    try {
      const r = await fetch(API_URL + '/save-chat', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ conversation_id: convId, title: title, messages: msgs, mode: mode })
      });
      const d = await r.json();
      const newId = d.success && d.data && d.data[0] ? d.data[0].id : convId;
      if (newId && newId !== convId) setCurrentId(newId);
      loadConversations();
      return newId;
    } catch (e) {
      return convId;
    }
  };

  const sendMessage = async (customInput) => {
    const messageText = customInput || input;
    if ((!messageText.trim() && attachments.length === 0) || loading) return;
    const attachmentsToSend = attachments;
    const displayContent = attachmentsToSend.length
      ? messageText + (messageText ? '\n' : '') + attachmentsToSend.map(a => `📎 ${a.name}`).join('\n')
      : messageText;
    const userMsg = { role: 'user', content: displayContent };
    const newMsgs = [...messages, userMsg];
    const convIdAtStart = currentId;
    setMessages(newMsgs);
    setInput('');
    setAttachments([]);
    setLoading(true);
    if (!session?.access_token) {
      setMessages([...newMsgs, { role: 'assistant', content: 'Your session expired. Please sign out and sign back in.' }]);
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(API_URL + '/chat-stream', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ message: messageText, mode: mode, history: messages, attachments: attachmentsToSend })
      });
      if (!response.ok) {
        let detail = '';
        try {
          const errData = await response.clone().json();
          detail = errData?.detail ? ': ' + errData.detail : '';
        } catch {}
        throw new Error(`Request failed (${response.status})${detail}`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = '';
      setMessages([...newMsgs, { role: 'assistant', content: '' }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        assistantMsg += chunk;
        setMessages([...newMsgs, { role: 'assistant', content: assistantMsg }]);
      }
      const final = [...newMsgs, { role: 'assistant', content: assistantMsg }];
      await saveChat(final, convIdAtStart);
    } catch (e) {
      setMessages([...newMsgs, { role: 'assistant', content: 'Connection error: ' + e.message }]);
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
    sendMessage(lastUser.content);
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
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ title: newTitle })
    });
    loadConversations();
  };

  const pinChat = async (id, currentPinned) => {
    await fetch(API_URL + '/conversations/' + id, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ pinned: !currentPinned })
    });
    loadConversations();
  };

  const archiveChat = async (id) => {
    await fetch(API_URL + '/conversations/' + id, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ archived: true })
    });
    if (currentId === id) { setMessages([]); setCurrentId(null); }
    loadConversations();
  };

  const deleteChat = async (id) => {
    if (!window.confirm('Delete this chat?')) return;
    await fetch(API_URL + '/conversations/' + id, { method: 'DELETE', headers: authHeaders() });
    if (currentId === id) { setMessages([]); setCurrentId(null); }
    loadConversations();
  };

  const exportData = async () => {
    const r = await fetch(API_URL + '/conversations', { headers: authHeaders() });
    const d = await r.json();
    const data = {
      email: session.user.email,
      exported_at: new Date().toISOString(),
      conversations: d.conversations
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zenithgpt-data-' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteAccount = async () => {
    if (!window.confirm('Are you sure? This will delete ALL your chats permanently!')) return;
    if (!window.confirm('Last warning: This action cannot be undone. Continue?')) return;
    try {
      await fetch(API_URL + '/delete-account', { method: 'DELETE', headers: authHeaders() });
      await supabase.auth.signOut();
      alert('Your account data has been deleted.');
    } catch (e) {
      alert('Error deleting account.');
    }
  };

  const suggestions = [
    { icon: <Sparkles size={18} />, title: 'Brainstorm ideas', text: 'for a weekend project' },
    { icon: <Code size={18} />, title: 'Write code', text: 'to parse a CSV file' },
    { icon: <Pencil size={18} />, title: 'Help me write', text: 'a professional email' },
    { icon: <Heart size={18} />, title: 'Give me advice', text: 'on healthy habits' }
  ];

  if (showPrivacy) return <Privacy onBack={() => setShowPrivacy(false)} />;
  if (!session) return <Auth />;

  return (
    <div className="app">
      {sidebarOpen && (
        <div className="sidebar">
          <div className="sidebar-top">
            <button className="icon-btn" onClick={() => setSidebarOpen(false)}><Menu size={20} /></button>
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
          <div className="profile-wrapper" onClick={(e) => e.stopPropagation()}>
            <button
              className="profile-trigger"
              onClick={() => setShowProfileMenu(v => !v)}
            >
              <div className="avatar">
                {userPhoto ? (
                  <img src={userPhoto} alt="You" />
                ) : (
                  session?.user?.email?.[0]?.toUpperCase() || 'U'
                )}
              </div>
              <span className="profile-name">{session?.user?.email?.split('@')[0] || 'User'}</span>
              <ChevronUp size={16} className="profile-chevron" />
            </button>
            {showProfileMenu && (
              <div className="profile-menu">
                <div className="profile-menu-email">{session?.user?.email}</div>
                <div className="profile-menu-sep" />
                <button onClick={() => { setShowSettings(true); setShowProfileMenu(false); }}>
                  <SettingsIcon size={16} /> Settings
                </button>
                <button onClick={() => { exportData(); setShowProfileMenu(false); }}>
                  <Download size={16} /> Export my data
                </button>
                <button onClick={() => { setShowPrivacy(true); setShowProfileMenu(false); }}>
                  <Shield size={16} /> Privacy Policy
                </button>
                <div className="profile-menu-sep" />
                <button onClick={() => { supabase.auth.signOut(); setShowProfileMenu(false); }}>
                  <LogOut size={16} /> Log out
                </button>
                <button className="profile-menu-danger" onClick={() => { deleteAccount(); setShowProfileMenu(false); }}>
                  <Trash2 size={16} /> Delete account
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      <div className="main">
        <div className="top-bar">
          {!sidebarOpen && <button className="icon-btn" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>}
          <div className="app-title">ZenithGPT</div>
          <div className="top-right" />
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
                  {m.role === 'assistant' && (
                    <div className="message-avatar assistant-avatar">
                      <img src="/logo192.png" alt="ZenithGPT" />
                    </div>
                  )}
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
              {loading && messages[messages.length - 1]?.content === '' && (
                <div className="message-row assistant">
                  <div className="message-avatar assistant-avatar">
                    <img src="/logo192.png" alt="ZenithGPT" />
                  </div>
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
          {attachments.length > 0 && (
            <div className="attachment-row">
              {attachments.map((a, i) => (
                <div key={i} className="attachment-chip">
                  {a.type === 'image' ? (
                    <img src={a.data} alt={a.name} className="attachment-thumb" />
                  ) : (
                    <FileText size={16} />
                  )}
                  <span className="attachment-name">{a.name}</span>
                  <button className="attachment-remove" onClick={() => removeAttachment(i)} title="Remove">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="input-pill">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
            />
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="*/*"
              style={{ display: 'none' }}
              onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
            />
            <div className="attach-wrapper" onClick={(e) => e.stopPropagation()}>
              <button
                className="plus-btn"
                onClick={() => setAttachMenuOpen(v => !v)}
                title="Attach files or photos"
              >
                <Plus size={18} />
              </button>
              {attachMenuOpen && (
                <div className="attach-menu">
                  <button onClick={() => openAttach('camera')}>
                    <Camera size={16} /> Take photo
                  </button>
                  <button onClick={() => openAttach('photo')}>
                    <ImageIcon size={16} /> Photo library
                  </button>
                  <button onClick={() => openAttach('file')}>
                    <Paperclip size={16} /> Upload file
                  </button>
                </div>
              )}
            </div>
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask anything"
              disabled={loading}
            />
            <button
              className={isListening ? 'mic-btn listening' : 'mic-btn'}
              onClick={toggleMic}
              title={isListening ? 'Stop listening' : 'Voice input'}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <button className="send-btn" onClick={() => sendMessage()} disabled={loading || (!input.trim() && attachments.length === 0)}>
              <ArrowUp size={16} />
            </button>
          </div>
          <p className="footer-text">ZenithGPT can make mistakes. Check important info. <span style={{opacity: 0.5, fontSize: '0.85em'}}>v2026.04.27</span></p>
        </div>
      </div>
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Settings</h2>
              <button className="icon-btn" onClick={() => setShowSettings(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="setting-row">
                <div className="setting-label">
                  <span className="setting-title">Profile photo</span>
                  <span className="setting-desc">Shown next to your name in the sidebar</span>
                </div>
                <div className="avatar-edit">
                  <div className="avatar avatar-large">
                    {userPhoto ? (
                      <img src={userPhoto} alt="You" />
                    ) : (
                      session?.user?.email?.[0]?.toUpperCase() || 'U'
                    )}
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleAvatarUpload}
                  />
                  <div className="avatar-edit-buttons">
                    <button className="modal-btn" onClick={() => avatarInputRef.current?.click()}>
                      {userPhoto ? 'Change' : 'Upload'}
                    </button>
                    {userPhoto && (
                      <button className="modal-btn modal-btn-ghost" onClick={removeAvatar}>Remove</button>
                    )}
                  </div>
                </div>
              </div>
              <div className="setting-row">
                <div className="setting-label">
                  <span className="setting-title">Theme</span>
                  <span className="setting-desc">Choose how ZenithGPT looks</span>
                </div>
                <div className="theme-toggle-group">
                  <button
                    className={theme === 'light' ? 'theme-opt active' : 'theme-opt'}
                    onClick={() => setTheme('light')}
                  >
                    <Sun size={14} /> Light
                  </button>
                  <button
                    className={theme === 'dark' ? 'theme-opt active' : 'theme-opt'}
                    onClick={() => setTheme('dark')}
                  >
                    <Moon size={14} /> Dark
                  </button>
                </div>
              </div>
              <div className="setting-row">
                <div className="setting-label">
                  <span className="setting-title">Email</span>
                  <span className="setting-desc">{session?.user?.email}</span>
                </div>
              </div>
              <div className="setting-row">
                <div className="setting-label">
                  <span className="setting-title">Version</span>
                  <span className="setting-desc">v2026.04.27</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
