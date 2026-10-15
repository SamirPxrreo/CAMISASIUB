import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Registro del service worker: es lo que hace que la app funcione sin conexion
// y no se re-descargue el bundle cada 10 minutos en el celular.
// Solo en produccion: en desarrollo estorba y confunde con el HMR de Vite.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('[SW] No se pudo registrar:', err)
    })
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)