import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// ── Code-splitting por ruta ─────────────────────────────────────────────────
// Cada "página" es su propio chunk: un visitante de /myapp nunca descarga
// el código de la landing (Hero/AlbumCube/Three.js del cubo) ni al revés.
// Esto es lo que más pesaba en la carga inicial — antes todo iba en un
// solo bundle de ~1.75MB sin importar la ruta.
const App       = lazy(() => import('./App.tsx'))
const Partners  = lazy(() => import('./sections/Partners.tsx'))
const Promotor  = lazy(() => import('./pages/Promotor'))
const MyApp      = lazy(() => import('./pages/MyApp'))
const Seguridad  = lazy(() => import('./pages/Seguridad'))
const MyAppAdmin = lazy(() => import('./pages/MyAppAdmin'))

const path = window.location.pathname.replace(/\/$/, '')

function pickRoute() {
  if (path === '/partners' || path === '/patrocinios') return Partners
  if (path === '/promotor') return Promotor
  if (path === '/myapp')    return MyApp
  if (path === '/seguridad') return Seguridad
  if (path === '/myapp-admin') return MyAppAdmin
  return App
}

const Route = pickRoute()

// Fallback minimalista — fondo oscuro a juego con cada página,
// para que no haya parpadeo blanco mientras carga el chunk.
function RouteFallback() {
  const bg = path === '/myapp' ? '#08080b' : (path === '/seguridad' || path === '/myapp-admin') ? '#000' : '#00164c'
  return <div style={{ position: 'fixed', inset: 0, background: bg }} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<RouteFallback />}>
      <Route />
    </Suspense>
  </StrictMode>,
)
