import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
// Clean initialization: ensure no stale storage or demo state persists in browser
try {
  localStorage.clear();
  sessionStorage.clear();
} catch (e) {
  // Ignore storage access errors in restricted iframe contexts
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
