import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Partners from './sections/Partners.tsx'

const path = window.location.pathname.replace(/\/$/, '')
const isPartners = path === '/partners' || path === '/patrocinios'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPartners ? <Partners /> : <App />}
  </StrictMode>,
)
