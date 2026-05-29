import { useState } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { api } from '../utils/api'
import { Card, CardHeader, Spinner, ErrorMsg, StatusBadge, RxBadge, PotenciaBadge, Badge, Empty, PageHeader } from '../components/UI'
import { AlertTriangle, Wifi, WifiOff, ZapOff, Signal } from 'lucide-react'

function AlertCard({ title, count, color, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const colors = { red: 'var(--red-subtle)', amber: 'var(--amber-subtle)', blue: 'var(--accent-blue-subtle)' }
  const textColors = { red: 'var(--red-text)', amber: 'var(--amber-text)', blue: 'var(--accent-blue-text)' }
  const borderColors = { red: '#4a1f1f', amber: '#4a3010', blue: '#1f3a5f' }

  return (
    <Card style={{ marginBottom: 16, border: `1px solid ${borderColors[color]}` }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', background: colors[color], borderRadius: open ? '10px 10px 0 0' : 10 }}
      >
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,0,0,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={textColors[color]} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: textColors[color], fontSize: 14 }}>{title}</div>
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: textColors[color], fontFamily: 'var(--font-mono)' }}>{count}</div>
        <span style={{ color: textColors[color], fontSize: 16 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && <div>{children}</div>}
    </Card>
  )
}

function OfflineAlertHero() {
  return (
    <div style={offlineHero}>
      <img src="./astronauta_offline.png" alt="Astronauta offline" style={offlineHeroImage} />
      <div style={offlineHeroText}>
        <div style={offlineHeroEyebrow}>Monitoramento de quedas</div>
        <div style={offlineHeroTitle}>ONUs e clientes que precisam de acao imediata.</div>
        <div style={offlineHeroBody}>
          Navegue direto pelos registros offline para priorizar atendimento, validacao de sinal e recuperacao do cliente.
        </div>
      </div>
    </div>
  )
}

export default function AlertasPage() {
  const navigate = useNavigate()
  const { data, loading, error } = useApi(() => api.alertas())

  if (loading) return <Spinner />
  if (error) return <ErrorMsg message={error} />
  if (!data) return null

  const { offline, desautorizadas, irregulares, baixoSinal, pioresPons, counts } = data

  const th = { padding: '9px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap' }
  const td = { padding: '9px 12px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)', whiteSpace: 'nowrap' }

  function OnuTable({ rows }) {
    if (!rows.length) return <Empty message="Nenhum item" />
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['OLT', 'GCOB', 'PON', 'Cliente', 'Login', 'MAC/Serial', 'Status', 'Sinal RX', 'Potência'].map(h => <th key={h} style={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}
                onClick={() => r['MAC/Serial'] && navigate(`/onus/${encodeURIComponent(r['MAC/Serial'])}`)}
                style={{ cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={td}><Badge color="blue" size="sm">{r.OLT}</Badge></td>
                <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.GCOB || '—'}</td>
                <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.PON}</td>
                <td style={td}>{r['Nome Cliente'] || '—'}</td>
                <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.Login || '—'}</td>
                <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>{r['MAC/Serial'] || '—'}</td>
                <td style={td}><StatusBadge status={r['Status ONU']} /></td>
                <td style={td}><RxBadge value={r['Sinal RX']} /></td>
                <td style={td}><PotenciaBadge value={r['Potência']} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Central de Alertas"
        subtitle="Equipamentos que requerem atenção imediata"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {Object.values(counts).reduce((a, b) => a + b, 0)} ocorrências
            </span>
          </div>
        }
      />

      <AlertCard title="ONUs Offline / Atenção" count={counts.offline} color="red" icon={WifiOff} defaultOpen>
        <OfflineAlertHero />
        <OnuTable rows={offline} />
      </AlertCard>

      <AlertCard title="ONUs Pedindo autenticacao" count={counts.desautorizadas} color="red" icon={Wifi}>
        <OnuTable rows={desautorizadas} />
      </AlertCard>

      <AlertCard title="Potência Irregular" count={counts.irregulares} color="amber" icon={ZapOff}>
        <OnuTable rows={irregulares.slice(0, 50)} />
        {irregulares.length > 50 && <div style={{ padding: '12px 18px', color: 'var(--text-secondary)', fontSize: 12 }}>+ {irregulares.length - 50} mais. Use a página de ONUs com filtro "Irregular" para ver todos.</div>}
      </AlertCard>

      <AlertCard title="Sinal RX crítico (abaixo de -27 dBm)" count={counts.baixoSinal} color="amber" icon={Signal}>
        <OnuTable rows={baixoSinal.slice(0, 30)} />
        {baixoSinal.length > 30 && <div style={{ padding: '12px 18px', color: 'var(--text-secondary)', fontSize: 12 }}>+ {baixoSinal.length - 30} mais registros com sinal crítico.</div>}
      </AlertCard>

      {/* Worst PONs */}
      <Card style={{ marginTop: 8 }}>
        <CardHeader
          title="Top 10 PONs com pior sinal"
          subtitle="Ordem crescente de Pior RX"
          action={<Badge color="amber"><AlertTriangle size={12} style={{ display: 'inline', marginRight: 4 }} />Requer atenção</Badge>}
        />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['#', 'PON ID', 'OLT', 'GCOB', 'Total ONUs', 'RX médio', 'Pior RX', 'Sem leitura'].map(h => <th key={h} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {pioresPons.map((p, i) => (
                <tr key={i}
                  onClick={() => p['PON ID'] && navigate(`/pons/${encodeURIComponent(p['PON ID'])}`)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...td, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{i + 1}</td>
                  <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-blue-text)' }}>{p['PON ID']}</td>
                  <td style={td}><Badge color="blue" size="sm">{p.OLT}</Badge></td>
                  <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{p.GCOB || '—'}</td>
                  <td style={td}><strong>{p['Total ONUs']}</strong></td>
                  <td style={td}><RxBadge value={p['Sinal RX médio']} /></td>
                  <td style={td}><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: p['Pior RX'] < -30 ? 'var(--red-text)' : 'var(--amber-text)', fontWeight: 600 }}>{p['Pior RX']?.toFixed(2)} dBm</span></td>
                  <td style={td}>{p['Sem leitura RX/zero'] > 0 ? <Badge color="amber" size="sm">{p['Sem leitura RX/zero']}</Badge> : <span style={{ color: 'var(--text-tertiary)' }}>0</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

const offlineHero = {
  display: 'flex',
  alignItems: 'center',
  gap: 18,
  padding: '18px 18px 10px',
  borderBottom: '1px solid var(--border-subtle)',
  background: 'linear-gradient(180deg, rgba(74,31,31,0.18), rgba(20,24,31,0))',
}

const offlineHeroImage = {
  width: 118,
  height: 'auto',
  display: 'block',
  flexShrink: 0,
  filter: 'drop-shadow(0 10px 24px rgba(0,0,0,.22))',
}

const offlineHeroText = {
  minWidth: 0,
}

const offlineHeroEyebrow = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '.1em',
  color: 'var(--red-text)',
  fontWeight: 700,
  marginBottom: 6,
}

const offlineHeroTitle = {
  fontSize: 18,
  lineHeight: 1.15,
  color: 'var(--text-primary)',
  fontWeight: 700,
  marginBottom: 6,
}

const offlineHeroBody = {
  fontSize: 13,
  lineHeight: 1.55,
  color: 'var(--text-secondary)',
  maxWidth: 620,
}
