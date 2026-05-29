import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Camera,
  LogOut,
  User,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'

function getAvatarKey(userId) {
  return `futuranet-avatar:${userId}`
}

export default function AppHeader() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [avatarUrl, setAvatarUrl] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const fileInputRef = useRef(null)
  const isHomeHub = location.pathname === '/'

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

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/')
  }

  return (
    <header style={header}>
      <div style={headerLeft}>
        {!isHomeHub && (
          <button type="button" onClick={handleBack} style={backBtn}>
            <ArrowLeft size={16} />
            Voltar
          </button>
        )}

        <div style={brandArea}>
          <img src="./Logo-Futuranet.png" alt="Logo Futuranet" style={brandLogo} />
          <div>
            <div style={brandEyebrow}>Painel</div>
            <div style={brandTitle}>Monitoramento FuturaNet</div>
          </div>
        </div>
      </div>
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
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 20,
  padding: '18px 28px',
  background:
    'linear-gradient(180deg, rgba(15, 23, 34, 0.96), rgba(12, 18, 28, 0.84))',
  borderBottom: '1px solid rgba(88, 166, 255, 0.14)',
  backdropFilter: 'blur(14px)',
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.16)',
  flexWrap: 'wrap',
}

const brandArea = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
}

const headerLeft = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  flexWrap: 'wrap',
}

const brandLogo = {
  width: 44,
  display: 'block',
}

const brandEyebrow = {
  fontSize: 10,
  color: 'var(--accent-blue-text)',
  textTransform: 'uppercase',
  letterSpacing: '.12em',
  fontWeight: 700,
}

const brandTitle = {
  fontSize: 17,
  color: 'var(--text-primary)',
  fontWeight: 700,
  letterSpacing: '-0.03em',
}

const backBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 14px',
  borderRadius: 999,
  border: '1px solid rgba(88, 166, 255, 0.18)',
  background: 'linear-gradient(180deg, rgba(18, 27, 39, 0.92), rgba(12, 18, 28, 0.96))',
  color: 'var(--text-primary)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 12px 28px rgba(0, 0, 0, 0.18)',
}

const userArea = {
  position: 'relative',
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
