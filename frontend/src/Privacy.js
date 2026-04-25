import React from 'react';
import './Privacy.css';

function Privacy({ onBack }) {
  return (
    <div className="privacy-container">
      <div className="privacy-content">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h1>Privacy Policy</h1>
        <p className="last-updated">Last updated: April 2026</p>

        <h2>What we collect</h2>
        <p>When you use ZenithGPT, we collect:</p>
        <ul>
          <li><strong>Email address</strong> — for account authentication</li>
          <li><strong>Your chat messages</strong> — to provide AI responses and save your history</li>
          <li><strong>Account preferences</strong> — like your selected AI mode and theme</li>
        </ul>

        <h2>How we use it</h2>
        <ul>
          <li>To provide AI-generated responses to your questions</li>
          <li>To save your chat history so you can access it later</li>
          <li>To improve the service over time</li>
        </ul>

        <h2>Who has access</h2>
        <p>Your data is stored securely in Supabase. Each user's chats are private and only accessible to them. We use industry-standard encryption (HTTPS) for all data transmission.</p>

        <h2>Third-party services</h2>
        <p>ZenithGPT uses these services to operate:</p>
        <ul>
          <li><strong>Groq AI</strong> — processes your messages to generate responses</li>
          <li><strong>Supabase</strong> — stores your account and chat data</li>
          <li><strong>Vercel</strong> — hosts the website</li>
          <li><strong>Render</strong> — hosts the backend API</li>
        </ul>

        <h2>Your rights</h2>
        <ul>
          <li><strong>Access</strong> — you can view all your chats in the app</li>
          <li><strong>Delete</strong> — you can delete individual chats or your entire account</li>
          <li><strong>Export</strong> — you can download all your data anytime</li>
        </ul>

        <h2>Contact</h2>
        <p>For privacy questions, email: patelsahils7262@gmail.com</p>
      </div>
    </div>
  );
}

export default Privacy;
