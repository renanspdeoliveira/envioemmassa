import { NavLink } from 'react-router-dom'
import { Activity, Database, Send, Wifi, WifiOff } from 'lucide-react'
import { PageHeader } from '../components/UI'

const hubLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: Wifi, accent: '#7cc6ff', description: 'Visao geral da operacao', position: 'hub-card-top-left' },
  { to: '/onus', label: 'ONUs', icon: Database, accent: '#63df86', description: 'Lista e detalhes da base', position: 'hub-card-top-right' },
  { to: '/sinal', label: 'Sinal', icon: Activity, accent: '#8ec5ff', description: 'Saude optica da rede', position: 'hub-card-bottom-left' },
  { to: '/clientes-24h-offline', label: 'Clientes 24h', icon: WifiOff, accent: '#ffb86f', description: 'Clientes em atencao', position: 'hub-card-bottom-right' },
  { to: '/envio', label: 'Envio', icon: Send, accent: '#7df9ff', description: 'Acoes e comunicacao', position: 'hub-card-center-right' },
]

export default function HomeHubPage() {
  return (
    <div>
      <style>{hubResponsiveCss}</style>
      <PageHeader title="Central FuturaNet" subtitle="Escolha um painel para entrar no fluxo operacional" align="center" />

      <section style={hubSection}>
        <div style={hubBackdropGlowA} />
        <div style={hubBackdropGlowB} />
        <div style={hubMesh} />
        <div style={hubIntro}>
          <div style={hubEyebrow}>Central de navegacao</div>
          <h2 style={hubTitle}>Selecione um ponto da operacao ao redor do hub.</h2>
          <p style={hubText}>
            O astronauta fica no centro da experiencia e os atalhos principais flutuam ao redor para um acesso rapido aos paineis da plataforma.
          </p>
        </div>

        <div style={hubStage} className="hub-stage">
          <div style={hubAstronautGlow} />
          <div style={hubAstronautWrap}>
            <img src="./astronauta-pronto.png" alt="Astronauta FuturaNet" style={hubAstronautImage} />
          </div>

          {hubLinks.map(({ to, label, icon: Icon, accent, description, position }) => (
            <NavLink key={to} to={to} style={{ textDecoration: 'none' }}>
              <div className={`hub-card ${position}`} style={hubCard(accent)}>
                <div style={hubCardIcon(accent)}>
                  <Icon size={17} color={accent} />
                </div>
                <div>
                  <div style={hubCardLabel}>{label}</div>
                  <div style={hubCardText}>{description}</div>
                </div>
              </div>
            </NavLink>
          ))}
        </div>
      </section>
    </div>
  )
}

const hubSection = {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: 30,
  padding: '26px 28px 36px',
  marginBottom: 20,
  border: '1px solid rgba(88,166,255,.14)',
  background: 'linear-gradient(180deg, rgba(13, 20, 30, 0.92), rgba(10, 17, 26, 0.96))',
  boxShadow: '0 28px 68px rgba(0,0,0,.24)',
}

const hubBackdropGlowA = {
  position: 'absolute',
  width: 360,
  height: 360,
  left: -80,
  top: -80,
  borderRadius: '50%',
  background: 'rgba(47, 188, 255, 0.12)',
  filter: 'blur(70px)',
}

const hubBackdropGlowB = {
  position: 'absolute',
  width: 420,
  height: 420,
  right: -110,
  bottom: -140,
  borderRadius: '50%',
  background: 'rgba(31, 111, 235, 0.14)',
  filter: 'blur(90px)',
}

const hubMesh = {
  position: 'absolute',
  inset: 0,
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
  backgroundSize: '34px 34px',
  maskImage: 'radial-gradient(circle at center, black 42%, transparent 100%)',
  opacity: 0.55,
}

const hubIntro = {
  position: 'relative',
  zIndex: 2,
  maxWidth: 560,
  margin: '0 auto 10px',
  textAlign: 'center',
}

const hubEyebrow = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '.12em',
  color: '#87dfff',
  fontWeight: 700,
  marginBottom: 10,
}

const hubTitle = {
  margin: 0,
  fontSize: 38,
  lineHeight: 1.02,
  letterSpacing: '-0.06em',
  color: '#f5fbff',
}

const hubText = {
  margin: '14px 0 0',
  fontSize: 14,
  lineHeight: 1.7,
  color: 'rgba(230,237,243,.74)',
  maxWidth: 500,
  marginInline: 'auto',
}

const hubStage = {
  position: 'relative',
  zIndex: 2,
  minHeight: 620,
  marginTop: 12,
}

const hubAstronautGlow = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  width: 520,
  height: 520,
  transform: 'translate(-50%, -44%)',
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(81, 225, 255, 0.16) 0%, rgba(31,111,235,0.12) 34%, transparent 72%)',
  filter: 'blur(24px)',
}

const hubAstronautWrap = {
  position: 'absolute',
  left: '50%',
  top: '51%',
  width: 620,
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
  animation: 'hubAstronautFloat 7.5s ease-in-out infinite',
}

const hubAstronautImage = {
  width: '40%',
  display: 'block',
  filter: 'drop-shadow(0 0 42px rgba(56, 208, 255, 0.18))',
  opacity: 0.96,
}

const hubCard = accent => ({
  position: 'absolute',
  width: 220,
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '16px 18px',
  borderRadius: 22,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'linear-gradient(180deg, rgba(20, 30, 43, 0.84), rgba(12, 18, 28, 0.92))',
  boxShadow: `0 18px 36px ${hexToRgba(accent, 0.14)}`,
  backdropFilter: 'blur(12px)',
  transition: 'transform .2s ease, border-color .2s ease, box-shadow .2s ease',
})

const hubCardIcon = accent => ({
  width: 44,
  height: 44,
  flexShrink: 0,
  borderRadius: 14,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: hexToRgba(accent, 0.14),
  border: `1px solid ${hexToRgba(accent, 0.24)}`,
})

const hubCardLabel = {
  fontSize: 15,
  fontWeight: 700,
  color: '#f5fbff',
  marginBottom: 4,
}

const hubCardText = {
  fontSize: 12,
  lineHeight: 1.45,
  color: 'rgba(230,237,243,.72)',
}

const hubResponsiveCss = `
  .hub-stage::before {
    content: '';
    position: absolute;
    inset: 21% 28%;
    border-radius: 50%;
    border: 1px solid rgba(142, 197, 255, 0.08);
    box-shadow: inset 0 0 40px rgba(88, 166, 255, 0.04);
    pointer-events: none;
  }

  .hub-card {
    animation: hubFloat 6.2s ease-in-out infinite;
  }

  .hub-card:hover {
    transform: translateY(-6px) scale(1.02);
  }

  .hub-card-top-left { left: 24%; top: 20%; animation-delay: .1s; }
  .hub-card-top-right { right: 24%; top: 20%; animation-delay: .5s; }
  .hub-card-bottom-left { left: 25%; bottom: 24%; animation-delay: .9s; }
  .hub-card-bottom-right { right: 22%; bottom: 18%; animation-delay: 1.3s; }
  .hub-card-center-right { right: 18%; top: 46%; transform: translateY(-50%); animation-delay: 1.7s; }
  .hub-card-center-right:hover { transform: translateY(calc(-50% - 6px)) scale(1.02); }

  @keyframes hubFloat {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }

  @keyframes hubAstronautFloat {
    0%, 100% { transform: translate(-50%, -50%) rotate(-1deg); }
    50% { transform: translate(-50%, calc(-50% - 14px)) rotate(1.5deg); }
  }

  @media (max-width: 1180px) {
    .hub-stage::before {
      inset: 120px 18% auto;
      height: 300px;
    }

    .hub-stage {
      min-height: auto !important;
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
      padding-top: 360px;
    }

    .hub-card,
    .hub-card-top-left,
    .hub-card-top-right,
    .hub-card-bottom-left,
    .hub-card-bottom-right,
    .hub-card-center-right {
      position: relative !important;
      inset: auto !important;
      left: auto !important;
      right: auto !important;
      top: auto !important;
      bottom: auto !important;
      width: 100% !important;
      transform: none !important;
    }
  }

  @media (max-width: 760px) {
    .hub-stage {
      grid-template-columns: 1fr !important;
      padding-top: 290px;
    }
  }
`

function hexToRgba(hex, alpha) {
  const value = hex.replace('#', '')
  const normalized = value.length === 3
    ? value.split('').map(char => char + char).join('')
    : value
  const intValue = parseInt(normalized, 16)
  const r = (intValue >> 16) & 255
  const g = (intValue >> 8) & 255
  const b = intValue & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
