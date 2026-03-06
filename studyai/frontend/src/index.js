const savedTheme = localStorage.getItem('studyai-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

import './theme.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);



