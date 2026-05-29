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
  const [info, setInfo] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setInfo('')

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) setError(signInError.message)
    setSubmitting(false)
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError('Informe seu email para recuperar a senha.')
      setInfo('')
      return
    }

    setSubmitting(true)
    setError('')
    setInfo('')

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim())

    if (resetError) {
      setError(resetError.message)
    } else {
      setInfo('Se o email existir, enviaremos as instrucoes de recuperacao.')
    }

    setSubmitting(false)
  }

  if (!enabled) return <Navigate to="/" replace />
  if (loading) return <Spinner size={24} />
  if (session) return <Navigate to={from} replace />

  return (
    <div style={page}>
      <style>{`
        @keyframes loginFadeOut {
          from { opacity: 1; }
          to { opacity: 0; visibility: hidden; }
        }

        @keyframes loginReveal {
          from {
            opacity: 0;
            transform: translateY(18px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes glowReveal {
          from {
            opacity: 0;
            transform: scale(0.92);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes astronautFloat {
          0% {
            transform: translate3d(0, 0, 0) rotate(-4deg);
          }
          50% {
            transform: translate3d(0, -16px, 0) rotate(-1deg);
          }
          100% {
            transform: translate3d(0, 0, 0) rotate(-4deg);
          }
        }

        .login-panel input:-webkit-autofill,
        .login-panel input:-webkit-autofill:hover,
        .login-panel input:-webkit-autofill:focus,
        .login-panel input:-webkit-autofill:active {
          -webkit-text-fill-color: #f4fbff;
          caret-color: #f4fbff;
          -webkit-box-shadow: 0 0 0 1000px rgba(18, 25, 36, 0.96) inset;
          box-shadow: 0 0 0 1000px rgba(18, 25, 36, 0.96) inset;
          transition: background-color 9999s ease-out 0s;
          border-radius: 0;
        }

        @media (max-width: 980px) {
          .login-split-layout {
            grid-template-columns: 1fr;
            gap: 18px;
            max-width: 540px;
          }

          .login-intro-column {
            min-height: auto;
            padding: 0;
            gap: 20px;
          }

          .login-panel {
            justify-self: stretch;
            max-width: none;
          }

          .login-astronaut {
            display: none;
          }
        }
      `}</style>
      <div style={introVeil} />
      <div style={mesh} />
      <div style={bgGlowA} />
      <div style={bgGlowB} />
      <div style={bgGlowC} />

      <div className="login-split-layout" style={layout}>
        <section className="login-intro-column" style={introColumn}>
          <div className="login-astronaut" style={astronautStage}>
            <div style={astronautWrap}>
              <div style={astronautHaloA} />
              <div style={astronautHaloB} />
              <div style={astronautGlow} />
              <img
                src="./astronauta.png"
                alt="Mascote Futuranet flutuando"
                style={astronautImage}
              />
            </div>
          </div>

          <div style={introContent}>
            <div style={heroBadge}>Acesso Seguro</div>
            <div style={welcomeWrap}>
              <h1 style={headline}>
                Bem-vindo
                <br />
                de volta.
              </h1>
              <p style={subline}>
                Acesse o painel de monitoramento da FuturaNet com rapidez, clareza e tudo o que sua operacao precisa na abertura do dia.
              </p>
            </div>

            <div style={featureBlock}>
              <div style={featureLine}>
                <span style={featureDot} />
                Monitoramento centralizado da rede
              </div>
              <div style={featureLine}>
                <span style={featureDot} />
                Acompanhamento rapido de clientes e ONUs
              </div>
              <div style={featureLine}>
                <span style={featureDot} />
                Comunicacao e operacao em um unico painel
              </div>
            </div>

          </div>

          <div style={copyright}>
            Copyright © Todos os direitos reservados à FuturaNet 2026
          </div>
        </section>

        <Card className="login-panel" style={panel}>
          <div style={panelAccent} />

          <div style={headerBlock}>
            <div style={logoFrame}>
              <img src="./Logo-Futuranet.png" alt="Logo Futuranet" style={logo} />
            </div>
            <div style={formIntroTitle}>Entre em sua conta</div>
            <div style={formIntroText}>Use seu email corporativo para continuar.</div>
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

            <div style={auxRow}>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={submitting}
                style={forgotBtn}
              >
                Esqueceu a senha?
              </button>
            </div>

            {error && <ErrorMsg message={error} />}
            {info && <div style={infoBox}>{info}</div>}

            <Btn type="submit" variant="primary" disabled={submitting} style={submitBtn}>
              {submitting ? 'Entrando...' : 'Entrar'}
            </Btn>
          </form>
        </Card>
      </div>
    </div>
  )
}

const page = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 32px',
  background: 'radial-gradient(circle at top, #17263f 0%, #101723 40%, #0b1017 100%)',
  position: 'relative',
  overflow: 'hidden',
}

const layout = {
  width: '100%',
  maxWidth: 1220,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.18fr) minmax(390px, 0.82fr)',
  alignItems: 'stretch',
  gap: 28,
  position: 'relative',
  zIndex: 1,
}

const introColumn = {
  minHeight: 592,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  padding: '18px 8px 8px 4px',
  position: 'relative',
  zIndex: 2,
  overflow: 'visible',
  animation: 'loginReveal 720ms cubic-bezier(.2,.8,.2,1) both',
}

const introContent = {
  maxWidth: 520,
  position: 'relative',
  zIndex: 2,
}

const introVeil = {
  position: 'absolute',
  inset: 0,
  background:
    'radial-gradient(circle at 50% 16%, rgba(18, 32, 53, 0.52) 0%, rgba(7, 10, 15, 0.96) 62%, #05070b 100%)',
  zIndex: 3,
  pointerEvents: 'none',
  animation: 'loginFadeOut 900ms ease-out forwards',
}

const mesh = {
  position: 'absolute',
  inset: 0,
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
  backgroundSize: '34px 34px',
  maskImage: 'radial-gradient(circle at center, black 40%, transparent 88%)',
  opacity: 0.42,
  animation: 'glowReveal 820ms ease-out both',
}

const panel = {
  width: '100%',
  maxWidth: 404,
  justifySelf: 'end',
  padding: '90px 50px 40px',
  position: 'relative',
  zIndex: 4,
  overflow: 'hidden',
  border: '1px solid rgba(88, 166, 255, 0.2)',
  background:
    'linear-gradient(180deg, rgba(19, 28, 42, 0.97) 0%, rgba(14, 20, 30, 0.96) 100%)',
  boxShadow: '0 30px 80px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.03) inset',
  backdropFilter: 'blur(14px)',
  animation: 'loginReveal 720ms cubic-bezier(.2,.8,.2,1) 140ms both',
}

const panelAccent = {
  position: 'absolute',
  inset: '0 0 auto 0',
  height: 4,
  background: 'linear-gradient(90deg, #58a6ff 0%, #56d364 50%, #58a6ff 100%)',
}

const headerBlock = {
  marginBottom: 18,
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

const welcomeWrap = {
  marginTop: 22,
}

const headline = {
  color: '#f4fbff',
  fontSize: 'clamp(44px, 6vw, 78px)',
  lineHeight: 0.94,
  letterSpacing: '-0.06em',
  fontWeight: 800,
  margin: 0,
  textWrap: 'balance',
}

const subline = {
  marginTop: 18,
  maxWidth: 470,
  color: 'rgba(222,231,241,0.74)',
  fontSize: 15,
  lineHeight: 1.65,
}

const featureBlock = {
  marginTop: 34,
  display: 'grid',
  gap: 12,
}

const astronautStage = {
  position: 'absolute',
  inset: 0,
  zIndex: 1,
  pointerEvents: 'none',
}

const astronautWrap = {
  position: 'absolute',
  right: -150,
  top: 8,
  width: 760,
  animation: 'loginReveal 920ms cubic-bezier(.2,.8,.2,1) 240ms both',
}

const astronautHaloA = {
  position: 'absolute',
  inset: '10% 14% 18% 10%',
  borderRadius: '50%',
  border: '1px solid rgba(113, 244, 255, 0.28)',
  boxShadow: '0 0 42px rgba(53, 214, 255, 0.12)',
  transform: 'rotate(18deg)',
}

const astronautHaloB = {
  position: 'absolute',
  inset: '24% 10% 12% 18%',
  borderRadius: '50%',
  border: '1px solid rgba(71, 186, 255, 0.2)',
  boxShadow: '0 0 44px rgba(71, 186, 255, 0.11)',
  transform: 'rotate(-34deg)',
}

const astronautGlow = {
  position: 'absolute',
  inset: '6% 2% 2% 2%',
  background:
    'radial-gradient(circle, rgba(26, 241, 255, 0.2) 0%, rgba(12, 144, 255, 0.16) 30%, rgba(4, 8, 15, 0) 78%)',
  filter: 'blur(54px)',
  transform: 'translateZ(0)',
}

const astronautImage = {
  position: 'relative',
  width: '130%',
  display: 'block',
  opacity: 0.84,
  filter: 'drop-shadow(0 0 26px rgba(38, 226, 255, 0.16)) drop-shadow(0 0 72px rgba(25, 129, 255, 0.12))',
  animation: 'astronautFloat 6.4s ease-in-out infinite',
}

const featureLine = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  color: '#c7d4e2',
  fontSize: 13,
  letterSpacing: '.01em',
}

const featureDot = {
  width: 8,
  height: 8,
  borderRadius: 999,
  background: 'linear-gradient(135deg, #58a6ff 0%, #56d364 100%)',
  boxShadow: '0 0 18px rgba(88, 166, 255, 0.45)',
  flexShrink: 0,
}

const logoFrame = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 2,
}

const logo = {
  width: 118,
  display: 'block',
  filter: 'drop-shadow(0 12px 26px rgba(88, 166, 255, 0.14))',
}

const formIntroTitle = {
  marginTop: 10,
  color: '#f4fbff',
  fontSize: 21,
  fontWeight: 750,
  letterSpacing: '-0.04em',
}

const formIntroText = {
  marginTop: 6,
  color: 'rgba(222,231,241,0.72)',
  fontSize: 12,
}

const form = {
  display: 'grid',
  gap: 11,
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
  borderRadius: 14,
  background: 'linear-gradient(180deg, rgba(28, 36, 49, 0.92), rgba(18, 25, 36, 0.96))',
  padding: '0 12px',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
}

const inputStyle = {
  flex: 1,
  background: 'transparent',
  border: 'none',
  color: 'var(--text-primary)',
  padding: '9px 0',
}

const auxRow = {
  display: 'flex',
  justifyContent: 'flex-end',
  marginTop: -2,
}

const forgotBtn = {
  appearance: 'none',
  background: 'transparent',
  border: 'none',
  padding: 0,
  color: '#8ec5ff',
  fontSize: 12,
  cursor: 'pointer',
}

const infoBox = {
  padding: 10,
  background: 'rgba(86, 211, 100, 0.1)',
  border: '1px solid rgba(86, 211, 100, 0.24)',
  borderRadius: 12,
  color: '#b8f3c2',
  fontSize: 12,
}

const submitBtn = {
  justifyContent: 'center',
  padding: '10px 16px',
  marginTop: 4,
  borderRadius: 14,
  background: 'linear-gradient(135deg, #1f6feb 0%, #2f81f7 50%, #58a6ff 100%)',
  boxShadow: '0 16px 34px rgba(31, 111, 235, 0.28)',
}

const copyright = {
  color: 'rgba(180,195,211,0.58)',
  fontSize: 12,
  letterSpacing: '.02em',
}

const bgGlowA = {
  position: 'absolute',
  width: 420,
  height: 420,
  background: 'rgba(31, 111, 235, 0.2)',
  filter: 'blur(95px)',
  top: -110,
  left: -70,
  animation: 'glowReveal 1s ease-out 120ms both',
}

const bgGlowB = {
  position: 'absolute',
  width: 320,
  height: 320,
  background: 'rgba(86, 211, 100, 0.12)',
  filter: 'blur(90px)',
  bottom: -70,
  right: -30,
  animation: 'glowReveal 1.1s ease-out 220ms both',
}

const bgGlowC = {
  position: 'absolute',
  width: 260,
  height: 260,
  background: 'rgba(210, 153, 34, 0.08)',
  filter: 'blur(95px)',
  top: '42%',
  right: '16%',
  animation: 'glowReveal 1.15s ease-out 280ms both',
}
