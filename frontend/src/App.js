import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('general');
  const [conversations, setConversations] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const endRef = useRef(null);

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
      const r = await fetch('https://zenithgpt-backend.onrender.com/conversations');
      const d = await r.json();
      setConversations(d.conversations || []);
    } catch (e) {}
  };

  const saveChat = async (msgs) => {
    if (msgs.length === 0) return;
    const found = conversations.find(c => c.id === currentId);
    const title = currentId && found ? found.title : msgs[0].content.substring(0, 40);
    try {
      const r = await fetch('https://zenithgpt-backend.onrender.com/save-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: currentId, title: title, messages: msgs, mode: mode })
      });
      const d = await r.json();
      if (d.success && d.data && d.data[0]) setCurrentId(d.data[0].id);
      loadConversations();
    } catch (e) {}
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput('');
    setLoading(true);
    try {
      const r = await fetch('https://zenithgpt-backend.onrender.com/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, mode: mode, history: messages })
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

  const renameChat = async (id) => {
    const newTitle = window.prompt('Rename chat:');
    if (!newTitle) return;
    await fetch('https://zenithgpt-backend.onrender.com/conversations/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle })
    });
    loadConversations();
  };

  const pinChat = async (id, currentPinned) => {
    await fetch('https://zenithgpt-backend.onrender.com/conversations/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !currentPinned })
    });
    loadConversations();
  };

  const archiveChat = async (id) => {
    await fetch('https://zenithgpt-backend.onrender.com/conversations/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: true })
    });
    if (currentId === id) { setMessages([]); setCurrentId(null); }
    loadConversations();
  };

  const deleteChat = async (id) => {
    if (!window.confirm('Delete this chat?')) return;
    await fetch('https://zenithgpt-backend.onrender.com/conversations/' + id, { method: 'DELETE' });
    if (currentId === id) { setMessages([]); setCurrentId(null); }
    loadConversations();
  };

  return (
    <div className="app">
      {sidebarOpen && (
        <div className="sidebar">
          <div className="sidebar-top">
            <button className="icon-btn" onClick={() => setSidebarOpen(false)}>☰</button>
            <button className="icon-btn" onClick={() => { setMessages([]); setCurrentId(null); }}>✎</button>
          </div>
          <button className="new-chat-btn" onClick={() => { setMessages([]); setCurrentId(null); }}>+ New chat</button>
          <div className="modes">
            <p className="section-label">MODES</p>
            <button className={mode === 'general' ? 'mode-btn active' : 'mode-btn'} onClick={() => setMode('general')}>General</button>
            <button className={mode === 'health' ? 'mode-btn active' : 'mode-btn'} onClick={() => setMode('health')}>Health AI</button>
            <button className={mode === 'code' ? 'mode-btn active' : 'mode-btn'} onClick={() => setMode('code')}>Code AI</button>
            <button className={mode === 'writing' ? 'mode-btn active' : 'mode-btn'} onClick={() => setMode('writing')}>Writing AI</button>
            <button className={mode === 'data' ? 'mode-btn active' : 'mode-btn'} onClick={() => setMode('data')}>Data AI</button>
          </div>
          {conversations.length > 0 && (
            <div className="history">
              <p className="section-label">CHATS</p>
              {conversations.map(c => (
                <div key={c.id} className={currentId === c.id ? 'chat-item active' : 'chat-item'}>
                  <button className="chat-title-btn" onClick={() => { setMessages(c.messages); setCurrentId(c.id); setMode(c.mode || 'general'); }}>
                    {c.pinned ? '📌 ' : ''}{c.title.substring(0, 22)}
                  </button>
                  <button className="menu-dots" onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === c.id ? null : c.id); }}>⋯</button>
                  {menuOpenId === c.id && (
                    <div className="chat-menu" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => { renameChat(c.id); setMenuOpenId(null); }}>✏️ Rename</button>
                      <button onClick={() => { alert('Projects coming soon!'); setMenuOpenId(null); }}>📁 Move to project</button>
                      <button onClick={() => { pinChat(c.id, c.pinned); setMenuOpenId(null); }}>{c.pinned ? '📌 Unpin' : '📌 Pin chat'}</button>
                      <button onClick={() => { archiveChat(c.id); setMenuOpenId(null); }}>📦 Archive</button>
                      <button className="menu-delete" onClick={() => { deleteChat(c.id); setMenuOpenId(null); }}>🗑 Delete</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="profile">
            <div className="avatar">S</div>
            <div>
              <p>Sahil Patel</p>
              <small>Free plan</small>
            </div>
          </div>
        </div>
      )}

      <div className="main">
        <div className="top-bar">
          {!sidebarOpen && <button className="icon-btn" onClick={() => setSidebarOpen(true)}>☰</button>}
          <div className="app-title">ZenithGPT <span className="chevron">⌄</span></div>
          <div className="top-right">
            <button className="icon-btn">👤+</button>
            <div className="avatar-small">S</div>
          </div>
        </div>

        <div className="chat-container">
          {messages.length === 0 ? (
            <div className="welcome">
              <h1>What can I help with?</h1>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={'message ' + m.role}>
                <div className="message-content">{m.content}</div>
              </div>
            ))
          )}
          {loading && <div className="message assistant"><div className="message-content">Thinking...</div></div>}
          <div ref={endRef} />
        </div>

        <div className="input-wrapper">
          <div className="input-pill">
            <button className="plus-btn">+</button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask anything"
              disabled={loading}
            />
            <span className="extended-label">● Extended ⌄</span>
            <button className="mic-btn">🎤</button>
            <button className="send-btn" onClick={sendMessage} disabled={loading || !input.trim()}>↑</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
