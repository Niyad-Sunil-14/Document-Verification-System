import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// main.jsx
createRoot(document.getElementById('root')).render(
  // Remove <React.StrictMode> for a quick test
  <App />
);