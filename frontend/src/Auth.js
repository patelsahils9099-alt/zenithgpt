import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import './Auth.css';

function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login'); // 'login', 'signup', 'forgot'
  const [message, setMessage] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Account created! Check your email to confirm.');
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: 'https://zenithgpt.vercel.app/reset-password'
        });
        if (error) throw error;
        setMessage('Password reset link sent! Check your email.');
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-logo">⚡ ZenithGPT</h1>
        <p className="auth-subtitle">
          {mode === 'signup' ? 'Create your account' : 
           mode === 'forgot' ? 'Reset your password' : 
           'Welcome back'}
        </p>
        
        <form onSubmit={handleAuth}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="auth-input"
          />
          {mode !== 'forgot' && (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="auth-input"
            />
          )}
          <button type="submit" disabled={loading} className="auth-button">
            {loading ? 'Loading...' : 
             mode === 'signup' ? 'Sign Up' : 
             mode === 'forgot' ? 'Send Reset Link' : 
             'Log In'}
          </button>
        </form>

        {message && <p className="auth-message">{message}</p>}

        <div className="auth-links">
          {mode === 'login' && (
            <>
              <button onClick={() => { setMode('forgot'); setMessage(''); }} className="auth-link">
                Forgot password?
              </button>
              <p className="auth-toggle">
                Don't have an account?
                <button onClick={() => { setMode('signup'); setMessage(''); }} className="auth-link"> Sign Up</button>
              </p>
            </>
          )}
          {mode === 'signup' && (
            <p className="auth-toggle">
              Already have an account?
              <button onClick={() => { setMode('login'); setMessage(''); }} className="auth-link"> Log In</button>
            </p>
          )}
          {mode === 'forgot' && (
            <p className="auth-toggle">
              Remember password?
              <button onClick={() => { setMode('login'); setMessage(''); }} className="auth-link"> Log In</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Auth;
