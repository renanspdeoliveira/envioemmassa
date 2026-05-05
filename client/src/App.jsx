import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import DashboardPage from './pages/DashboardPage'
import OnusPage from './pages/OnusPage'
import OnuDetailPage from './pages/OnuDetailPage'
import PonsPage from './pages/PonsPage'
import PonDetailPage from './pages/PonDetailPage'
import AlertasPage from './pages/AlertasPage'
import SinalPage from './pages/SinalPage'
import EnvioMassaPage from './pages/EnvioMassaPage'
import IxcConfigPage from './pages/IxcConfigPage'

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <main style={{ marginLeft: 220, flex: 1, padding: '28px 32px', minHeight: '100vh', maxWidth: 'calc(100vw - 220px)' }}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/onus" element={<OnusPage />} />
            <Route path="/onus/:mac" element={<OnuDetailPage />} />
            <Route path="/pons" element={<PonsPage />} />
            <Route path="/pons/:ponId" element={<PonDetailPage />} />
            <Route path="/alertas" element={<AlertasPage />} />
            <Route path="/sinal" element={<SinalPage />} />
            <Route path="/envio" element={<EnvioMassaPage />} />
            <Route path="/ixc" element={<IxcConfigPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
