import { useApi } from '../hooks/useApi'
import { api } from '../utils/api'
import { Card, CardHeader, Spinner, ErrorMsg, Badge } from '../components/UI'
import { PageHeader } from '../components/UI'
import { CheckCircle, Radio, Server, Wifi, WifiOff } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'

const CHART_COLORS = ['#58a6ff', '#56d364', '#e3b341', '#ff7b72', '#8b949e']
const RX_DIST_COLORS = ['#56d364', '#58a6ff', '#e3b341', '#ff7b72', '#484f58']

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(13, 17, 23, 0.94)', border: '1px solid rgba(88, 166, 255, 0.18)', borderRadius: 10, padding: '10px 12px', fontSize: 12, boxShadow: '0 18px 40px rgba(0,0,0,.28)' }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || 'var(--text-primary)' }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  )
}

function MetricCard({ label, value, sub, icon: Icon, color, glow, illustrationSrc }) {
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 18,
        padding: '18px 18px 16px',
        border: '1px solid rgba(255,255,255,.06)',
        background: `linear-gradient(160deg, ${glow} 0%, rgba(28,33,40,0.96) 55%)`,
        boxShadow: '0 18px 45px rgba(0,0,0,.22)',
      }}
    >
      <div style={{ position: 'absolute', inset: 'auto -20px -26px auto', width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }} />
      {illustrationSrc && (
        <img
          src={illustrationSrc}
          alt=""
          aria-hidden="true"
          style={metricIllustration}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(230,237,243,.76)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>{label}</div>
          <div style={{ fontSize: 31, lineHeight: 1, marginTop: 10, color, fontWeight: 700, letterSpacing: '-.04em' }}>{value}</div>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,.08)' }}>
          <Icon size={18} color={color} />
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'rgba(230,237,243,.68)', marginTop: 12 }}>{sub}</div>
    </div>
  )
}

function SurfaceCard({ children, style = {} }) {
  return (
    <Card
      style={{
        background: 'linear-gradient(180deg, rgba(30,36,45,.96) 0%, rgba(22,27,34,.98) 100%)',
        border: '1px solid rgba(88,166,255,.08)',
        boxShadow: '0 20px 44px rgba(0,0,0,.18)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </Card>
  )
}

export default function DashboardPage() {
  const { data: stats, loading, error } = useApi(() => api.stats(), [], { refreshInterval: 30000 })
  const { data: rxData } = useApi(() => api.chartRxSlot(), [], { refreshInterval: 30000 })
  const { data: rxDist } = useApi(() => api.chartRxDist(), [], { refreshInterval: 30000 })

  if (loading) return <Spinner />
  if (error) return <ErrorMsg message={error} />

  const oltData = Object.entries(stats.oltCounts || {}).map(([name, value]) => ({ name, value }))
  const statusData = [
    { name: 'Autorizadas', value: stats.autorizadas, color: '#56d364' },
    { name: 'Pedindo autenticacao', value: stats.desautorizadas, color: '#ff7b72' },
    { name: 'Sem status', value: stats.semStatus, color: '#e3b341' },
  ]
  const onlinePct = stats.total ? ((stats.online / stats.total) * 100).toFixed(1) : '0.0'

  return (
    <div>
      <PageHeader title="Visao Geral" subtitle="Panorama operacional da base GPON em tempo quase real" />

      <div style={heroWrap}>
        <div style={heroGlowA} />
        <div style={heroGlowB} />
        <div style={heroMain}>
          <div>
            <div style={heroEyebrow}>Rede ativa</div>
            <div style={heroValue}>{stats.total?.toLocaleString('pt-BR')}</div>
            <div style={heroSubtitle}>ONUs monitoradas neste momento</div>
          </div>
          <div style={heroBadges}>
            <Badge color="green">{onlinePct}% online</Badge>
            <Badge color="blue">{stats.totalPons?.toLocaleString('pt-BR')} PONs</Badge>
            <Badge color="amber">{stats.semLeituraRx?.toLocaleString('pt-BR')} sem leitura RX</Badge>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginBottom: 24 }}>
        <MetricCard label="Total de ONUs" value={stats.total?.toLocaleString('pt-BR')} sub="todos os equipamentos da base" icon={Wifi} color="#7cc6ff" glow="rgba(31,111,235,0.28)" />
        <MetricCard label="ONUs Online" value={stats.online?.toLocaleString('pt-BR')} sub={`${onlinePct}% da base com sinal`} icon={CheckCircle} color="#63df86" glow="rgba(63,185,80,0.24)" illustrationSrc="./astronauta-online.png" />
        <MetricCard label="Alertas Offline" value={stats.offlineAtencao?.toLocaleString('pt-BR')} sub="equipamentos que pedem atencao" icon={WifiOff} color="#ff8d88" glow="rgba(248,81,73,0.24)" illustrationSrc="./astronauta_offline.png" />
        <MetricCard label="Total de PONs" value={stats.totalPons?.toLocaleString('pt-BR')} sub={`${stats.semLeituraRx} sem leitura RX`} icon={Radio} color="#77b9ff" glow="rgba(88,166,255,0.22)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <SurfaceCard>
          <CardHeader title="ONUs por OLT" subtitle="Distribuicao total de clientes" />
          <div style={{ padding: '16px 10px' }}>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={oltData} margin={{ top: 8, right: 18, left: -10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#9fb0c2', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9fb0c2', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="ONUs" radius={[8, 8, 0, 0]}>
                  {oltData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <CardHeader title="Status das ONUs" subtitle="Visao rapida da autorizacao na rede" />
          <div style={{ padding: '16px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={54} outerRadius={82} paddingAngle={4} dataKey="value">
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
              {statusData.map(s => (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.05)', padding: '6px 10px', borderRadius: 999 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{s.name}</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{s.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </SurfaceCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 16 }}>
        <SurfaceCard>
          <CardHeader title="Distribuicao de Sinal RX" subtitle="Qualidade optica por faixa" />
          <div style={{ padding: '12px 8px' }}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={rxDist || []} layout="vertical" margin={{ top: 6, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#9fb0c2', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" width={128} tick={{ fill: '#9fb0c2', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="ONUs" radius={[0, 8, 8, 0]}>
                  {(rxDist || []).map((_, i) => <Cell key={i} fill={RX_DIST_COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <CardHeader title="Sinal RX medio por GBOC" subtitle="Saude optica dos segmentos" />
          <div style={{ padding: '12px 8px' }}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={rxData || []} margin={{ top: 8, right: 16, left: -10, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#9fb0c2', fontSize: 10, angle: -45, textAnchor: 'end' }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fill: '#9fb0c2', fontSize: 11 }} axisLine={false} tickLine={false} domain={['auto', 0]} />
                <Tooltip content={<CustomTooltip />} formatter={(v) => [`${v} dBm`, 'RX medio']} />
                <Bar dataKey="avgRx" name="RX medio" radius={[8, 8, 0, 0]}>
                  {(rxData || []).map((d, i) => {
                    const color = d.avgRx > -20 ? '#56d364' : d.avgRx >= -24 ? '#58a6ff' : d.avgRx >= -27 ? '#e3b341' : '#ff7b72'
                    return <Cell key={i} fill={color} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard>
        <CardHeader title="Resumo por OLT" subtitle="Peso relativo de cada concentrador na rede" />
        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {Object.entries(stats.oltCounts || {}).map(([olt, count]) => (
            <div
              key={olt}
              style={{
                background: 'linear-gradient(180deg, rgba(88,166,255,.10) 0%, rgba(28,33,40,.72) 100%)',
                borderRadius: 16,
                padding: '16px 18px',
                border: '1px solid rgba(88,166,255,.10)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 10, background: 'rgba(88,166,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Server size={14} color="var(--accent-blue-text)" />
                </div>
                <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{olt}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#7cc6ff', marginBottom: 4, letterSpacing: '-.03em' }}>{count.toLocaleString('pt-BR')}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>ONUs conectadas</div>
              <div style={{ marginTop: 10 }}>
                <Badge color="green">{((count / stats.total) * 100).toFixed(1)}% da rede</Badge>
              </div>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </div>
  )
}

const heroWrap = {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: 22,
  padding: 22,
  marginBottom: 18,
  border: '1px solid rgba(88,166,255,.12)',
  background: 'linear-gradient(135deg, rgba(31,111,235,.14) 0%, rgba(22,27,34,.92) 42%, rgba(32,38,48,.95) 100%)',
  boxShadow: '0 26px 50px rgba(0,0,0,.22)',
}

const heroMain = {
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: 20,
  flexWrap: 'wrap',
}

const heroEyebrow = {
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '.08em',
  color: '#8ec5ff',
  fontWeight: 700,
}

const heroValue = {
  fontSize: 58,
  lineHeight: 1,
  marginTop: 8,
  color: '#f4fbff',
  fontWeight: 800,
  letterSpacing: '-0.05em',
}

const heroSubtitle = {
  fontSize: 14,
  color: 'rgba(230,237,243,.72)',
  marginTop: 8,
}

const heroBadges = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
}

const heroGlowA = {
  position: 'absolute',
  width: 240,
  height: 240,
  borderRadius: '50%',
  background: 'rgba(88,166,255,.16)',
  top: -80,
  right: -30,
  filter: 'blur(20px)',
}

const heroGlowB = {
  position: 'absolute',
  width: 180,
  height: 180,
  borderRadius: '50%',
  background: 'rgba(86,211,100,.10)',
  bottom: -70,
  left: -40,
  filter: 'blur(16px)',
}

const metricIllustration = {
  position: 'absolute',
  right: 8,
  bottom: 6,
  width: 86,
  height: 'auto',
  opacity: 0.92,
  pointerEvents: 'none',
  filter: 'drop-shadow(0 10px 22px rgba(0,0,0,.18))',
}
