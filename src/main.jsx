import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import TelaAprovacao from './TelaAprovacao.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {location.pathname === '/aprovacao' ? <TelaAprovacao /> : <App />}
  </React.StrictMode>
)
