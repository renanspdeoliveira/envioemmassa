import { NavLink } from 'react-router-dom'
import { Activity, Database, LayoutDashboard, Send } from 'lucide-react'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/onus', label: 'Base de ONUs', icon: Database },
  { to: '/sinal', label: 'Analise de Sinal', icon: Activity },
]

const bottom = [
  { to: '/envio', label: 'Envio em Massa', icon: Send, accent: 'amber' },
]

export default function Sidebar() {
  return (
    <aside
      style={{
        width: 220,
        minHeight: '100vh',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 100,
      }}
    >
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="./Logo-Futuranet.png" style={{ width: 100 }} />
            </div>
            <h1 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-.02em' }} >Monitoramento</h1>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}> </div>
          </div>
        </div>
      </div>

      <nav style={{ padding: '10px 8px', flex: 1 }}>
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 'var(--radius-md)',
              marginBottom: 2,
              fontSize: 13,
              fontWeight: isActive ? 500 : 400,
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: isActive ? 'var(--bg-hover)' : 'transparent',
              textDecoration: 'none',
              transition: 'all .15s',
              border: isActive ? '1px solid var(--border)' : '1px solid transparent',
            })}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '8px 8px 12px', borderTop: '1px solid var(--border)' }}>
        {bottom.map(({ to, label, icon: Icon, accent }) => {
          const colors = {
            amber: { text: 'var(--amber-text)', bg: 'var(--amber-subtle)', border: '#4a3010' },
            blue: { text: 'var(--accent-blue-text)', bg: 'var(--accent-blue-subtle)', border: '#1f3a5f' },
          }
          const c = colors[accent] || colors.blue

          return (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                marginBottom: 4,
                fontSize: 13,
                fontWeight: isActive ? 500 : 400,
                color: isActive ? 'white' : c.text,
                background: isActive ? c.text : c.bg,
                textDecoration: 'none',
                transition: 'all .15s',
                border: `1px solid ${c.border}`,
              })}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          )
        })}
      </div>
    </aside>
  )
}
