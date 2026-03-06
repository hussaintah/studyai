// ── THEME: runs before React renders — prevents flash of wrong theme ──
const savedTheme = localStorage.getItem('studyai-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
