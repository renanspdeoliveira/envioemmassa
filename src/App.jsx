import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Routes, Route, useLocation } from 'react-router-dom'
import AppHeader from './components/AppHeader'
import AppFooter from './components/AppFooter'
import ProtectedRoute from './auth/ProtectedRoute'
import { Spinner } from './components/UI'

const HomeHubPage = lazy(() => import('./pages/HomeHubPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const OnusPage = lazy(() => import('./pages/OnusPage'))
const OnuDetailPage = lazy(() => import('./pages/OnuDetailPage'))
const OnuDesautorizadasPage = lazy(() => import('./pages/OnuDesautorizadasPage'))
const PonsPage = lazy(() => import('./pages/PonsPage'))
const PonDetailPage = lazy(() => import('./pages/PonDetailPage'))
const SinalPage = lazy(() => import('./pages/SinalPage'))
const EnvioMassaPage = lazy(() => import('./pages/EnvioMassaPage'))
const IxcConfigPage = lazy(() => import('./pages/IxcConfigPage'))
const Clientes24hOfflinePage = lazy(() => import('./pages/Clientes24hOfflinePage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))

function AppShell() {
  const location = useLocation()
  const showHeader = location.pathname !== '/'

  return (
    <div style={shell}>
      <div style={shellGlowA} />
      <div style={shellGlowB} />
      <div style={shellAstronaut} />
      <div style={shellMesh} />
      {showHeader && <AppHeader />}
      <main style={main}>
        <Suspense fallback={<Spinner size={24} />}>
          <Routes>
            <Route path="/" element={<HomeHubPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/onus-desautorizadas" element={<OnuDesautorizadasPage />} />
            <Route path="/onus" element={<OnusPage />} />
            <Route path="/onus/:mac" element={<OnuDetailPage />} />
            <Route path="/pons" element={<PonsPage />} />
            <Route path="/pons/:ponId" element={<PonDetailPage />} />
            <Route path="/sinal" element={<SinalPage />} />
            <Route path="/clientes-24h-offline" element={<Clientes24hOfflinePage />} />
            <Route path="/envio" element={<EnvioMassaPage />} />
            <Route path="/ixc" element={<IxcConfigPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <AppFooter />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<Spinner size={24} />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="*"
            element={(
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            )}
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

const shell = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  background:
    'radial-gradient(circle at top left, rgba(22, 61, 118, 0.22), transparent 28%), radial-gradient(circle at bottom right, rgba(14, 108, 83, 0.18), transparent 26%), linear-gradient(180deg, #0b1017 0%, #0e1420 52%, #0b1017 100%)',
  overflow: 'hidden',
}

const main = {
  flex: 1,
  padding: '26px 28px 0',
  position: 'relative',
  zIndex: 2,
}

const shellGlowA = {
  position: 'absolute',
  width: 420,
  height: 420,
  left: -120,
  top: -80,
  background: 'rgba(56, 139, 253, 0.14)',
  filter: 'blur(90px)',
  pointerEvents: 'none',
}

const shellGlowB = {
  position: 'absolute',
  width: 360,
  height: 360,
  right: -120,
  bottom: 30,
  background: 'rgba(86, 211, 100, 0.12)',
  filter: 'blur(100px)',
  pointerEvents: 'none',
}

const shellAstronaut = {
  position: 'absolute',
  inset: 0,
  backgroundImage:
    "radial-gradient(circle at 66% 38%, rgba(71, 222, 255, 0.14), transparent 16%), radial-gradient(circle at 58% 62%, rgba(58, 130, 246, 0.12), transparent 18%), url('./astronauta-app-bg.png')",
  backgroundRepeat: 'no-repeat, no-repeat, no-repeat',
  backgroundSize: '5740px 540px, 420px 420px, min(1120px, 76vw)',
  backgroundPosition: '62% 28%, 68% 60%, right -80px center',
  opacity: 0.28,
  mixBlendMode: 'screen',
  filter: 'drop-shadow(0 0 40px rgba(64, 220, 255, 0.18))',
  pointerEvents: 'none',
}

const shellMesh = {
  position: 'absolute',
  inset: 0,
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
  backgroundSize: '30px 30px',
  maskImage: 'radial-gradient(circle at center, black 55%, transparent 100%)',
  opacity: 0.55,
  pointerEvents: 'none',
}
