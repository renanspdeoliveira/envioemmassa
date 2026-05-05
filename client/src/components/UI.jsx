import { Loader2 } from 'lucide-react'

export function StatCard({ label, value, sub, color, icon: Icon }) {
  const colors = {
    green: { text: 'var(--green-text)', bg: 'var(--green-subtle)' },
    red: { text: 'var(--red-text)', bg: 'var(--red-subtle)' },
    amber: { text: 'var(--amber-text)', bg: 'var(--amber-subtle)' },
    blue: { text: 'var(--accent-blue-text)', bg: 'var(--accent-blue-subtle)' },
    default: { text: 'var(--text-primary)', bg: 'var(--bg-tertiary)' },
  }
  const c = colors[color] || colors.default

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '16px 18px',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</span>
        {Icon && <div style={{ width: 28, height: 28, borderRadius: 6, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} color={c.text} />
        </div>}
      </div>
      <div style={{ fontSize: 26, fontWeight: 600, color: c.text, letterSpacing: '-.02em', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{sub}</div>}
    </div>
  )
}

export function Badge({ children, color = 'default', size = 'md' }) {
  const colors = {
    green: { bg: 'var(--green-subtle)', text: 'var(--green-text)', border: '#2d4a2d' },
    red: { bg: 'var(--red-subtle)', text: 'var(--red-text)', border: '#4a1f1f' },
    amber: { bg: 'var(--amber-subtle)', text: 'var(--amber-text)', border: '#4a3010' },
    blue: { bg: 'var(--accent-blue-subtle)', text: 'var(--accent-blue-text)', border: '#1f3a5f' },
    gray: { bg: 'var(--bg-tertiary)', text: 'var(--text-secondary)', border: 'var(--border)' },
    default: { bg: 'var(--bg-tertiary)', text: 'var(--text-secondary)', border: 'var(--border)' },
  }
  const c = colors[color] || colors.default
  const pad = size === 'sm' ? '2px 6px' : '3px 8px'
  const fs = size === 'sm' ? 10 : 11

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: pad, borderRadius: 20,
      background: c.bg, color: c.text,
      border: `1px solid ${c.border}`,
      fontSize: fs, fontWeight: 500, whiteSpace: 'nowrap',
    }}>{children}</span>
  )
}

export function StatusBadge({ status }) {
  const map = {
    'Autorizada': ['green', '● Autorizada'],
    'Desautorizada': ['red', '● Desautorizada'],
    'Sem status': ['amber', '● Sem status'],
  }
  const [color, label] = map[status] || ['gray', status]
  return <Badge color={color}>{label}</Badge>
}

export function PotenciaBadge({ value }) {
  if (value === 'Irregular') return <Badge color="amber">⚠ Irregular</Badge>
  return <Badge color="gray">Indefinido</Badge>
}

export function RxBadge({ value }) {
  if (!value || value === 0) return <span style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>—</span>
  const color = value > -20 ? '#56d364' : value >= -24 ? '#58a6ff' : value >= -27 ? '#e3b341' : '#ff7b72'
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color }}>{value.toFixed(2)} dBm</span>
}

export function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', ...style
    }}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text-primary)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  )
}

export function Spinner({ size = 18 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <Loader2 size={size} style={{ color: 'var(--accent-blue-text)', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export function ErrorMsg({ message }) {
  return (
    <div style={{ padding: 20, background: 'var(--red-subtle)', border: '1px solid #4a1f1f', borderRadius: 'var(--radius-md)', color: 'var(--red-text)', fontSize: 13 }}>
      ⚠ {message}
    </div>
  )
}

export function Empty({ message = 'Nenhum resultado encontrado' }) {
  return (
    <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
      {message}
    </div>
  )
}

export function Input({ style = {}, ...props }) {
  return (
    <input
      style={{
        background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
        padding: '7px 12px', fontSize: 13, outline: 'none',
        transition: 'border-color .15s',
        ...style
      }}
      onFocus={e => e.target.style.borderColor = 'var(--accent-blue)'}
      onBlur={e => e.target.style.borderColor = 'var(--border)'}
      {...props}
    />
  )
}

export function Select({ children, style = {}, ...props }) {
  return (
    <select
      style={{
        background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
        padding: '7px 10px', fontSize: 13, outline: 'none', cursor: 'pointer',
        ...style
      }}
      {...props}
    >
      {children}
    </select>
  )
}

export function Btn({ children, variant = 'default', style = {}, ...props }) {
  const variants = {
    default: { bg: 'var(--bg-tertiary)', border: 'var(--border)', color: 'var(--text-primary)' },
    primary: { bg: 'var(--accent-blue)', border: 'var(--accent-blue)', color: '#fff' },
    danger: { bg: 'var(--red-subtle)', border: '#4a1f1f', color: 'var(--red-text)' },
  }
  const v = variants[variant] || variants.default
  return (
    <button
      style={{
        background: v.bg, border: `1px solid ${v.border}`,
        borderRadius: 'var(--radius-md)', color: v.color,
        padding: '7px 14px', fontSize: 13, fontWeight: 500,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        transition: 'opacity .15s', ...style
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = '.8'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      {...props}
    >
      {children}
    </button>
  )
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-.02em' }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
