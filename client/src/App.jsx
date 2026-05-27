import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import DashboardPage from './pages/DashboardPage'
import OnusPage from './pages/OnusPage'
import OnuDetailPage from './pages/OnuDetailPage'
import OnuDesautorizadasPage from './pages/OnuDesautorizadasPage'
import PonsPage from './pages/PonsPage'
import PonDetailPage from './pages/PonDetailPage'
import SinalPage from './pages/SinalPage'
import EnvioMassaPage from './pages/EnvioMassaPage'
import IxcConfigPage from './pages/IxcConfigPage'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './auth/ProtectedRoute'

function AppShell() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: 252, flex: 1, padding: '28px 32px', minHeight: '100vh', maxWidth: 'calc(100vw - 252px)' }}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/onus-desautorizadas" element={<OnuDesautorizadasPage />} />
          <Route path="/onus" element={<OnusPage />} />
          <Route path="/onus/:mac" element={<OnuDetailPage />} />
          <Route path="/pons" element={<PonsPage />} />
          <Route path="/pons/:ponId" element={<PonDetailPage />} />
          <Route path="/sinal" element={<SinalPage />} />
          <Route path="/envio" element={<EnvioMassaPage />} />
          <Route path="/ixc" element={<IxcConfigPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  )
}
