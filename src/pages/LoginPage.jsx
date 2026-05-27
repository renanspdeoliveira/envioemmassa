import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { LockKeyhole, Mail } from 'lucide-react'
import { Btn, Card, ErrorMsg, Input, Spinner } from '../components/UI'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const { session, loading, enabled } = useAuth()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!enabled) return <Navigate to="/" replace />
  if (loading) return <Spinner size={24} />
  if (session) return <Navigate to={from} replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) setError(signInError.message)
    setSubmitting(false)
  }

  return (
    <div style={page}>
      <div style={mesh} />
      <div style={bgGlowA} />
      <div style={bgGlowB} />
      <div style={bgGlowC} />

      <Card style={panel}>
        <div style={panelAccent} />

        <div style={headerBlock}>
          <div style={heroBadge}>Acesso Seguro</div>
          <div style={logoFrame}>
            <img src="./Logo-Futuranet.png" alt="Logo Futuranet" style={logo} />
          </div>
          
          <div style={subline}>Entre com seu usuario para acessar a operacao da rede.</div>
        </div>

        <form onSubmit={handleSubmit} style={form}>
          <label style={field}>
            <span style={label}>Email</span>
            <div style={inputWrap}>
              <Mail size={16} color="var(--accent-blue-text)" />
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Seu email@empresa.com"
                autoComplete="email"
                required
                style={inputStyle}
              />
            </div>
          </label>

          <label style={field}>
            <span style={label}>Senha</span>
            <div style={inputWrap}>
              <LockKeyhole size={16} color="var(--accent-blue-text)" />
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Sua senha"
                autoComplete="current-password"
                required
                style={inputStyle}
              />
            </div>
          </label>

          {error && <ErrorMsg message={error} />}

          <Btn type="submit" variant="primary" disabled={submitting} style={submitBtn}>
            {submitting ? 'Entrando...' : 'Entrar'}
          </Btn>
        </form>
      </Card>
    </div>
  )
}

const page = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  background: 'radial-gradient(circle at top, #17263f 0%, #101723 40%, #0b1017 100%)',
  position: 'relative',
  overflow: 'hidden',
}

const mesh = {
  position: 'absolute',
  inset: 0,
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
  backgroundSize: '34px 34px',
  maskImage: 'radial-gradient(circle at center, black 40%, transparent 88%)',
  opacity: 0.42,
}

const panel = {
  width: '100%',
  maxWidth: 436,
  padding: '30px 28px 28px',
  position: 'relative',
  zIndex: 1,
  overflow: 'hidden',
  border: '1px solid rgba(88, 166, 255, 0.2)',
  background:
    'linear-gradient(180deg, rgba(19, 28, 42, 0.97) 0%, rgba(14, 20, 30, 0.96) 100%)',
  boxShadow: '0 30px 80px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.03) inset',
  backdropFilter: 'blur(14px)',
}

const panelAccent = {
  position: 'absolute',
  inset: '0 0 auto 0',
  height: 4,
  background: 'linear-gradient(90deg, #58a6ff 0%, #56d364 50%, #58a6ff 100%)',
}

const headerBlock = {
  marginBottom: 24,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
}

const heroBadge = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 10px',
  borderRadius: 999,
  border: '1px solid rgba(88, 166, 255, 0.2)',
  background: 'rgba(88, 166, 255, 0.1)',
  color: '#8ec5ff',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  marginBottom: 16,
}

const logoFrame = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 158,
  height: 158,
  borderRadius: 30,
  background:
    'radial-gradient(circle at 30% 30%, rgba(88, 166, 255, 0.18), rgba(17, 24, 36, 0.88) 68%)',
  border: '1px solid rgba(88, 166, 255, 0.18)',
  boxShadow: '0 14px 40px rgba(4, 8, 15, 0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
}

const logo = {
  width: 124,
  display: 'block',
  filter: 'drop-shadow(0 8px 22px rgba(88, 166, 255, 0.16))',
}

const headline = {
  marginTop: 18,
  color: '#f4fbff',
  fontSize: 28,
  fontWeight: 800,
  letterSpacing: '-0.04em',
}

const subline = {
  marginTop: 8,
  color: 'rgba(230,237,243,.7)',
  fontSize: 13,
  maxWidth: 300,
}

const form = {
  display: 'grid',
  gap: 15,
}

const field = { display: 'grid', gap: 7 }

const label = {
  fontSize: 12,
  color: '#b4c3d3',
  fontWeight: 600,
  letterSpacing: '.02em',
}

const inputWrap = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  border: '1px solid rgba(88, 166, 255, 0.18)',
  borderRadius: 16,
  background: 'linear-gradient(180deg, rgba(28, 36, 49, 0.92), rgba(18, 25, 36, 0.96))',
  padding: '0 14px',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
}

const inputStyle = {
  flex: 1,
  background: 'transparent',
  border: 'none',
  color: 'var(--text-primary)',
  padding: '13px 0',
}

const submitBtn = {
  justifyContent: 'center',
  padding: '12px 16px',
  marginTop: 6,
  borderRadius: 16,
  background: 'linear-gradient(135deg, #1f6feb 0%, #2f81f7 50%, #58a6ff 100%)',
  boxShadow: '0 16px 34px rgba(31, 111, 235, 0.28)',
}

const bgGlowA = {
  position: 'absolute',
  width: 420,
  height: 420,
  background: 'rgba(31, 111, 235, 0.2)',
  filter: 'blur(95px)',
  top: -110,
  left: -70,
}

const bgGlowB = {
  position: 'absolute',
  width: 320,
  height: 320,
  background: 'rgba(86, 211, 100, 0.12)',
  filter: 'blur(90px)',
  bottom: -70,
  right: -30,
}

const bgGlowC = {
  position: 'absolute',
  width: 260,
  height: 260,
  background: 'rgba(210, 153, 34, 0.08)',
  filter: 'blur(95px)',
  top: '42%',
  right: '16%',
}
