import { Link } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { api } from '../utils/api'
import { StatCard, Card, CardHeader, Spinner, ErrorMsg, Badge } from '../components/UI'
import { PageHeader } from '../components/UI'
import { Activity, AlertTriangle, CheckCircle, Radio, Server, Wifi, WifiOff } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

const CHART_COLORS = ['#58a6ff', '#56d364', '#e3b341', '#ff7b72', '#8b949e']

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { data: stats, loading, error } = useApi(() => api.stats())
  const { data: rxData } = useApi(() => api.chartRxSlot())
  const { data: rxDist } = useApi(() => api.chartRxDist())

  if (loading) return <Spinner />
  if (error) return <ErrorMsg message={error} />

  const oltData = Object.entries(stats.oltCounts || {}).map(([name, value]) => ({ name, value }))

  const statusData = [
    { name: 'Autorizadas', value: stats.autorizadas, color: '#56d364' },
    { name: 'Pedindo autenticacao', value: stats.desautorizadas, color: '#ff7b72' },
    { name: 'Sem status', value: stats.semStatus, color: '#e3b341' },
  ]

  const rxDistColors = ['#56d364', '#58a6ff', '#e3b341', '#ff7b72', '#484f58']

  return (
    <div>
      <PageHeader
        title="Visao Geral"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total de ONUs" value={stats.total?.toLocaleString('pt-BR')} sub="todos os equipamentos" icon={Wifi} color="blue" />
        <StatCard label="Autorizadas" value={stats.autorizadas?.toLocaleString('pt-BR')} sub={`${((stats.autorizadas / stats.total) * 100).toFixed(1)}% do total`} icon={CheckCircle} color="green" />
        <Link to="/onus-desautorizadas" style={{ textDecoration: 'none' }}>
          <StatCard label="Pedindo autenticacao" value={stats.desautorizadas?.toLocaleString('pt-BR')} sub="abrir lista de ONUs" icon={AlertTriangle} color="amber" />
        </Link>
        <StatCard label="Irregulares" value={stats.irregulares?.toLocaleString('pt-BR')} sub="sinal fora do padrao" icon={AlertTriangle} color="amber" />
        <StatCard label="Alertas offline" value={stats.offlineAtencao} sub="ONUs para atencao" icon={WifiOff} color="red" />
        <StatCard label="Total de PONs" value={stats.totalPons} sub={`${stats.semLeituraRx} sem leitura RX`} icon={Radio} color="blue" />
        <StatCard label="RX medio" value={stats.avgRx ? `${stats.avgRx} dBm` : '-'} sub={`pior: ${stats.worstRx} dBm`} icon={Activity} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card>
          <CardHeader title="ONUs por OLT" subtitle="Distribuicao total de clientes" />
          <div style={{ padding: '16px 8px' }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={oltData} margin={{ top: 4, right: 16, left: -10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="ONUs" radius={[4, 4, 0, 0]}>
                  {oltData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Status das ONUs" subtitle="Autorizacao na rede" />
          <div style={{ padding: '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={3} dataKey="value">
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
              {statusData.map(s => (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, display: 'inline-block' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{s.name}</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{s.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 16 }}>
        <Card>
          <CardHeader title="Distribuicao de Sinal RX" subtitle="Qualidade optica das ONUs" />
          <div style={{ padding: '12px 8px' }}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={rxDist || []} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" width={130} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="ONUs" radius={[0, 4, 4, 0]}>
                  {(rxDist || []).map((_, i) => <Cell key={i} fill={rxDistColors[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Sinal RX medio por GBOC" subtitle="Saude optica por segmento" />
          <div style={{ padding: '12px 8px' }}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={rxData || []} margin={{ top: 4, right: 16, left: -10, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'var(--text-secondary)', fontSize: 10, angle: -45, textAnchor: 'end' }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} domain={['auto', 0]} />
                <Tooltip content={<CustomTooltip />} formatter={(v) => [`${v} dBm`, 'RX medio']} />
                <Bar dataKey="avgRx" name="RX medio" radius={[3, 3, 0, 0]}>
                  {(rxData || []).map((d, i) => {
                    const color = d.avgRx > -20 ? '#56d364' : d.avgRx >= -24 ? '#58a6ff' : d.avgRx >= -27 ? '#e3b341' : '#ff7b72'
                    return <Cell key={i} fill={color} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Resumo por OLT" />
        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {Object.entries(stats.oltCounts || {}).map(([olt, count]) => (
            <div key={olt} style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: '14px 16px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Server size={14} color="var(--accent-blue-text)" />
                <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{olt}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--accent-blue-text)', marginBottom: 4 }}>{count.toLocaleString('pt-BR')}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>ONUs conectadas</div>
              <div style={{ marginTop: 8 }}>
                <Badge color="green">{((count / stats.total) * 100).toFixed(1)}% da rede</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
