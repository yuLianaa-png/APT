import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { instalarConsolaMock } from './services/consolaMock'
import { limpiarLegado } from './utils/limpiarLegado'

// Borra del navegador las claves que escribió el prototipo anterior. Ningún código nuevo
// las lee, pero confunden al depurar. Se puede quitar cuando pase un tiempo del cambio.
limpiarLegado()

// Herramientas de consola del almacén simulado (window.__mock). No hacen nada si
// VITE_USAR_MOCKS está apagado.
instalarConsolaMock()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
