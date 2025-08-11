import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
// CHANGE THIS LINE:
import './styles/globals.css' // Use the correct path to your global CSS file

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
