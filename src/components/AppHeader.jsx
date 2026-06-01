import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Camera,
  LogOut,
  User,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'

const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/onus', label: 'ONUs' },
  { to: '/sinal', label: 'Sinal' },
  { to: '/onus-desautorizadas', label: 'Desautorizadas' },
  { to: '/linkloss', label: 'Link Loss' },
  { to: '/clientes-24h-offline', label: 'Clientes 24h' },
  { to: '/envio', label: 'Envio' },
]

function getAvatarKey(userId) {
  return `futuranet-avatar:${userId}`
}

export default function AppHeader() {
  const { user } = useAuth()
  const [avatarUrl, setAvatarUrl] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!user?.id) {
      setAvatarUrl('')
      return
    }
    const savedAvatar = window.localStorage.getItem(getAvatarKey(user.id)) || ''
    setAvatarUrl(savedAvatar)
  }, [user?.id])

  const initials = useMemo(() => {
    const source = user?.email || 'U'
    return source.slice(0, 1).toUpperCase()
  }, [user?.email])

  async function handleSignOut() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) console.error('[supabase.signOut]', error.message)
  }

  function handlePickAvatar() {
    fileInputRef.current?.click()
  }

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      if (!result) return
      window.localStorage.setItem(getAvatarKey(user.id), result)
      setAvatarUrl(result)
      setMenuOpen(false)
    }
    reader.readAsDataURL(file)
  }

  return (
    <header style={header}>
      <div style={headerLeft}>
        <div style={brandArea}>
          <img src="./Logo-Futuranet.png" alt="Logo Futuranet" style={brandLogo} />
        </div>
      </div>

      <nav style={nav}>
        {navLinks.map(({ to, label, end }) => (
          <NavLink key={to} to={to} end={end} style={({ isActive }) => navLink(isActive)}>
            {label}
          </NavLink>
        ))}
      </nav>

      <div style={userArea}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          style={{ display: 'none' }}
        />

        <button
          type="button"
          onClick={() => setMenuOpen(open => !open)}
          style={avatarButton}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Foto do usuario" style={avatarImage} />
          ) : (
            <div style={avatarFallback}>{initials || <User size={16} />}</div>
          )}
        </button>

        {menuOpen && (
          <div style={menu}>
            <div style={menuEmail}>{user?.email || 'usuario autenticado'}</div>

            <button type="button" onClick={handlePickAvatar} style={menuBtn}>
              <Camera size={15} />
              Alterar foto
            </button>

            <button type="button" onClick={handleSignOut} style={menuBtn}>
              <LogOut size={15} />
              Sair
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

const header = {
  position: 'sticky',
  top: 0,
  zIndex: 40,
  display: 'grid',
  gridTemplateColumns: 'max-content minmax(0, 1fr) max-content',
  alignItems: 'center',
  gap: 20,
  padding: '18px 28px',
  background:
    'linear-gradient(180deg, rgba(15, 23, 34, 0.96), rgba(12, 18, 28, 0.84))',
  borderBottom: '1px solid rgba(88, 166, 255, 0.14)',
  backdropFilter: 'blur(14px)',
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.16)',
}

const brandArea = {
  display: 'flex',
  alignItems: 'center',
}

const headerLeft = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  flexWrap: 'wrap',
  flexShrink: 0,
}

const brandLogo = {
  width: 48,
  display: 'block',
}

const nav = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  flex: 1,
  flexWrap: 'wrap',
  minWidth: 0,
  margin: '0 auto',
  maxWidth: 920,
}

const navLink = isActive => ({
  padding: '9px 14px',
  borderRadius: 999,
  border: `1px solid ${isActive ? 'rgba(88, 166, 255, 0.34)' : 'rgba(255,255,255,0.06)'}`,
  background: isActive
    ? 'linear-gradient(135deg, rgba(31, 111, 235, 0.92), rgba(88, 166, 255, 0.72))'
    : 'linear-gradient(180deg, rgba(18, 27, 39, 0.72), rgba(12, 18, 28, 0.88))',
  color: isActive ? '#fff' : 'var(--text-secondary)',
  fontSize: 13,
  fontWeight: 600,
  textDecoration: 'none',
  boxShadow: isActive ? '0 12px 24px rgba(31, 111, 235, 0.18)' : 'none',
  transition: 'all .18s ease',
  whiteSpace: 'nowrap',
})

const userArea = {
  position: 'relative',
  flexShrink: 0,
  justifySelf: 'end',
}

const avatarButton = {
  width: 44,
  height: 44,
  borderRadius: 999,
  border: '1px solid rgba(88, 166, 255, 0.2)',
  background: 'linear-gradient(180deg, rgba(24, 32, 43, 0.92), rgba(17, 23, 32, 0.96))',
  padding: 0,
  overflow: 'hidden',
  cursor: 'pointer',
  boxShadow: '0 10px 22px rgba(0, 0, 0, 0.2)',
}

const avatarImage = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
}

const avatarFallback = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#f4fbff',
  fontWeight: 700,
  fontSize: 15,
}

const menu = {
  position: 'absolute',
  right: 0,
  top: 54,
  minWidth: 220,
  padding: 10,
  borderRadius: 16,
  border: '1px solid rgba(88, 166, 255, 0.14)',
  background: 'linear-gradient(180deg, rgba(20, 28, 39, 0.98), rgba(12, 18, 27, 0.98))',
  boxShadow: '0 18px 48px rgba(0, 0, 0, 0.32)',
}

const menuEmail = {
  padding: '8px 10px 12px',
  color: 'var(--text-primary)',
  fontSize: 12,
  fontWeight: 600,
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  marginBottom: 8,
  wordBreak: 'break-word',
}

const menuBtn = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 10px',
  borderRadius: 12,
  border: 'none',
  background: 'transparent',
  color: 'var(--text-secondary)',
  fontSize: 13,
  textAlign: 'left',
  cursor: 'pointer',
}
