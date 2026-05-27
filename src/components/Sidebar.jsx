import { NavLink } from 'react-router-dom'
import { Activity, ChevronRight, Database, LayoutDashboard, LogOut, Send } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, description: 'Visao geral da rede' },
  { to: '/onus', label: 'Base de ONUs', icon: Database, description: 'Consulta e acompanhamento' },
  { to: '/sinal', label: 'Analise de Sinal', icon: Activity, description: 'Faixas e qualidade optica' },
]

const bottom = [
  { to: '/envio', label: 'Envio em Massa', icon: Send, accent: 'amber', description: 'Comunicacao segmentada' },
]

export default function Sidebar() {
  const { user, enabled } = useAuth()

  async function handleSignOut() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) console.error('[supabase.signOut]', error.message)
  }

  return (
    <aside style={sidebar}>
      <div style={glowTop} />

      <div style={header}>
        <div style={logoWrap}>
          <img src="./Logo-Futuranet.png" alt="Logo Futuranet" style={logo} />
        </div>
        <div style={brandBlock}>
          <span style={eyebrow}>Painel</span>
          <h1 style={title}>Monitoramento</h1>
        </div>
      </div>

      <nav style={nav}>
        <div style={sectionLabel}>Navegacao</div>
        {links.map(({ to, label, icon: Icon, description }) => (
          <NavLink key={to} to={to} end={to === '/'}>
            {({ isActive }) => (
              <div style={navItem(isActive)}>
                <div style={navIconWrap(isActiveColor(isActive).iconBg)}>
                  <Icon size={17} color={isActiveColor(isActive).icon} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={navTitle(isActive)}>{label}</div>
                  <div style={navDescription(isActive)}>{description}</div>
                </div>
                <ChevronRight size={16} color={isActive ? 'rgba(255,255,255,0.95)' : 'var(--text-tertiary)'} />
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      <div style={footer}>
        <div style={sectionLabel}>Atalhos</div>
        {bottom.map(({ to, label, icon: Icon, accent, description }) => {
          const c = accentColors(accent)

          return (
            <NavLink key={to} to={to}>
              {({ isActive }) => (
                <div style={accentItem(isActive, c)}>
                  <div style={navIconWrap(isActive ? 'rgba(255,255,255,0.18)' : c.iconBg)}>
                    <Icon size={17} color={isActive ? '#fff' : c.icon} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={accentTitle(isActive)}>{label}</div>
                    <div style={accentDescription(isActive)}>{description}</div>
                  </div>
                </div>
              )}
            </NavLink>
          )
        })}

        {enabled && (
          <>
            <div style={accountCard}>
              <div style={accountLabel}>Sessao ativa</div>
              <div style={accountEmail}>{user?.email || 'usuario autenticado'}</div>
            </div>

            <button type="button" onClick={handleSignOut} style={signOutBtn}>
              <LogOut size={16} />
              Sair
            </button>
          </>
        )}
      </div>
    </aside>
  )
}

function isActiveColor(isActive) {
  return isActive
    ? {
        icon: '#ffffff',
        iconBg: 'rgba(255,255,255,0.16)',
      }
    : {
        icon: 'var(--accent-blue-text)',
        iconBg: 'rgba(88, 166, 255, 0.12)',
      }
}

function accentColors(accent) {
  const colors = {
    amber: {
      icon: 'var(--amber-text)',
      iconBg: 'rgba(227, 179, 65, 0.12)',
      bg: 'linear-gradient(180deg, rgba(53, 34, 14, 0.92), rgba(33, 22, 11, 0.96))',
      border: 'rgba(227, 179, 65, 0.2)',
      activeBg: 'linear-gradient(135deg, #d29922 0%, #e3b341 100%)',
    },
  }

  return colors[accent] || colors.amber
}

const sidebar = {
  width: 252,
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #121923 0%, #0f151d 100%)',
  borderRight: '1px solid rgba(88, 166, 255, 0.12)',
  boxShadow: '18px 0 48px rgba(0, 0, 0, 0.18)',
  display: 'flex',
  flexDirection: 'column',
  position: 'fixed',
  left: 0,
  top: 0,
  zIndex: 100,
  overflow: 'hidden',
}

const glowTop = {
  position: 'absolute',
  width: 220,
  height: 220,
  background: 'rgba(31, 111, 235, 0.16)',
  filter: 'blur(70px)',
  top: -70,
  left: -60,
  pointerEvents: 'none',
}

const header = {
  position: 'relative',
  padding: '22px 18px 18px',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  display: 'flex',
  alignItems: 'center',
  gap: 14,
}

const logoWrap = {
  width: 64,
  height: 64,
  borderRadius: 18,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(180deg, rgba(26, 35, 48, 0.98), rgba(15, 21, 30, 0.98))',
  border: '1px solid rgba(88, 166, 255, 0.14)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 12px 30px rgba(0,0,0,0.22)',
}

const logo = {
  width: 48,
  display: 'block',
}

const brandBlock = {
  display: 'grid',
  gap: 2,
}

const eyebrow = {
  fontSize: 10,
  color: 'var(--accent-blue-text)',
  textTransform: 'uppercase',
  letterSpacing: '.12em',
  fontWeight: 700,
}

const title = {
  fontSize: 18,
  fontWeight: 700,
  color: 'var(--text-primary)',
  letterSpacing: '-0.03em',
  lineHeight: 1.1,
}

const nav = {
  padding: '18px 12px 8px',
  flex: 1,
}

const footer = {
  padding: '10px 12px 16px',
  borderTop: '1px solid rgba(255,255,255,0.05)',
}

const sectionLabel = {
  padding: '0 6px 10px',
  fontSize: 10,
  color: '#7f8da0',
  textTransform: 'uppercase',
  letterSpacing: '.14em',
  fontWeight: 700,
}

const navItem = isActive => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 12px',
  borderRadius: 18,
  marginBottom: 8,
  textDecoration: 'none',
  border: isActive ? '1px solid rgba(88, 166, 255, 0.22)' : '1px solid rgba(255,255,255,0.04)',
  background: isActive
    ? 'linear-gradient(135deg, rgba(31, 111, 235, 0.92), rgba(88, 166, 255, 0.72))'
    : 'linear-gradient(180deg, rgba(24, 32, 43, 0.78), rgba(17, 23, 32, 0.86))',
  boxShadow: isActive ? '0 14px 26px rgba(31, 111, 235, 0.18)' : 'none',
  transition: 'all .18s ease',
})

const navIconWrap = background => ({
  width: 36,
  height: 36,
  borderRadius: 12,
  background,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
})

const navTitle = isActive => ({
  fontSize: 13,
  fontWeight: 700,
  color: isActive ? '#fff' : 'var(--text-primary)',
  lineHeight: 1.2,
})

const navDescription = isActive => ({
  fontSize: 11,
  color: isActive ? 'rgba(255,255,255,0.82)' : '#7f8da0',
  marginTop: 2,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
})

const accentItem = (isActive, c) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 12px',
  borderRadius: 18,
  marginBottom: 10,
  textDecoration: 'none',
  border: `1px solid ${isActive ? 'rgba(255,255,255,0.15)' : c.border}`,
  background: isActive ? c.activeBg : c.bg,
  boxShadow: isActive ? '0 16px 34px rgba(227, 179, 65, 0.2)' : 'none',
  transition: 'all .18s ease',
})

const accentTitle = isActive => ({
  fontSize: 13,
  fontWeight: 700,
  color: isActive ? '#16110a' : 'var(--text-primary)',
  lineHeight: 1.2,
})

const accentDescription = isActive => ({
  fontSize: 11,
  color: isActive ? 'rgba(22, 17, 10, 0.74)' : '#c9a55a',
  marginTop: 2,
})

const accountCard = {
  borderRadius: 18,
  padding: '12px 12px',
  border: '1px solid rgba(255,255,255,0.06)',
  background: 'linear-gradient(180deg, rgba(22, 29, 40, 0.92), rgba(14, 19, 27, 0.94))',
  marginTop: 2,
  marginBottom: 10,
}

const accountLabel = {
  fontSize: 10,
  color: '#7f8da0',
  textTransform: 'uppercase',
  letterSpacing: '.12em',
  fontWeight: 700,
  marginBottom: 6,
}

const accountEmail = {
  fontSize: 12,
  color: 'var(--text-primary)',
  fontWeight: 600,
  wordBreak: 'break-word',
}

const signOutBtn = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '11px 14px',
  borderRadius: 16,
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-secondary)',
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.08)',
}
