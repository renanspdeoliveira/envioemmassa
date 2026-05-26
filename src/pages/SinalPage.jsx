import { useApi } from '../hooks/useApi'
import { api } from '../utils/api'
import { Card, CardHeader, Spinner, ErrorMsg, PageHeader, Badge } from '../components/UI'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ReferenceLine, Cell
} from 'recharts'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || 'var(--text-primary)' }}>
          {p.name}: <strong>{typeof p.value === 'number' ? `${p.value.toFixed(2)} dBm` : p.value}</strong>
        </div>
      ))}
    </div>
  )
}

function RxCell({ rx }) {
  if (!rx) return null
  const color = rx > -20 ? '#56d364' : rx >= -24 ? '#58a6ff' : rx >= -27 ? '#e3b341' : '#ff7b72'
  return <Cell fill={color} />
}

export default function SinalPage() {
  const { data: rxData, loading: l1 } = useApi(() => api.chartRxSlot())
  const { data: rxDist, loading: l2 } = useApi(() => api.chartRxDist())
  const { data: vlanData, loading: l3 } = useApi(() => api.chartVlan())

  if (l1 || l2 || l3) return <Spinner />

  const LIMIARES = [
    { label: 'Excelente', range: 'acima de -20 dBm', color: '#56d364' },
    { label: 'Bom', range: '-20 a -24 dBm', color: '#58a6ff' },
    { label: 'Regular', range: '-24 a -27 dBm', color: '#e3b341' },
    { label: 'Ruim', range: 'abaixo de -27 dBm', color: '#ff7b72' },
  ]

  return (
    <div>
      <PageHeader
        title="Análise de Sinal"
        subtitle="Qualidade óptica da rede GPON — métricas RX por segmento"
      />

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {LIMIARES.map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, display: 'inline-block', boxShadow: `0 0 6px ${l.color}40` }} />
            <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-primary)' }}>{l.label}</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{l.range}</span>
          </div>
        ))}
      </div>

      {/* Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card>
          <CardHeader title="Distribuição por qualidade de sinal" subtitle="Contagem de ONUs por faixa de RX" />
          <div style={{ padding: '12px 8px' }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={rxDist || []} margin={{ top: 4, right: 16, left: -10, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'var(--text-secondary)', fontSize: 11, angle: -30, textAnchor: 'end' }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} formatter={(v) => [v, 'ONUs']} />
                <Bar dataKey="count" name="ONUs" radius={[4, 4, 0, 0]}>
                  {(rxDist || []).map((_, i) => {
                    const colors = ['#56d364', '#58a6ff', '#e3b341', '#ff7b72', '#484f58']
                    return <Cell key={i} fill={colors[i]} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* VLAN distribution */}
        <Card>
          <CardHeader title="ONUs por VLAN" subtitle="Top 15 VLANs mais utilizadas" />
          <div style={{ padding: '12px 8px' }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={vlanData || []} margin={{ top: 4, right: 16, left: -10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="vlan" tick={{ fill: 'var(--text-secondary)', fontSize: 11, angle: -30, textAnchor: 'end' }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} formatter={(v) => [v, 'ONUs']} />
                <Bar dataKey="count" name="ONUs" fill="#1f6feb" radius={[4, 4, 0, 0]}>
                  {(vlanData || []).map((_, i) => <Cell key={i} fill={`hsl(${210 - i * 8}, 60%, ${55 - i * 1}%)`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* RX by slot - full width */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Sinal RX médio por Slot / OLT" subtitle="Identificação de segmentos com degradação óptica" />
        <div style={{ padding: '12px 8px' }}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={rxData || []} margin={{ top: 8, right: 16, left: -10, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-secondary)', fontSize: 10, angle: -50, textAnchor: 'end' }} axisLine={false} tickLine={false} interval={0} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} domain={[-30, 0]} />
              <ReferenceLine y={-20} stroke="#56d364" strokeDasharray="4 4" label={{ value: '-20 dBm (limite excelente)', fill: '#56d364', fontSize: 10 }} />
              <ReferenceLine y={-24} stroke="#e3b341" strokeDasharray="4 4" label={{ value: '-24 dBm (limite bom)', fill: '#e3b341', fontSize: 10 }} />
              <ReferenceLine y={-27} stroke="#ff7b72" strokeDasharray="4 4" label={{ value: '-27 dBm (limite crítico)', fill: '#ff7b72', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} formatter={(v) => [`${v.toFixed(2)} dBm`, 'RX médio']} />
              <Bar dataKey="avgRx" name="RX médio" radius={[3, 3, 0, 0]}>
                {(rxData || []).map((d, i) => {
                  const color = d.avgRx > -20 ? '#56d364' : d.avgRx >= -24 ? '#58a6ff' : d.avgRx >= -27 ? '#e3b341' : '#ff7b72'
                  return <Cell key={i} fill={color} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Summary table */}
      <Card>
        <CardHeader title="Tabela de médias por Slot" />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['OLT', 'Slot', 'RX médio', 'Classificação'].map(h => (
                  <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(rxData || []).map((d, i) => {
                const cls = d.avgRx > -20 ? ['green', 'Excelente'] : d.avgRx >= -24 ? ['blue', 'Bom'] : d.avgRx >= -27 ? ['amber', 'Regular'] : ['red', 'Ruim']
                return (
                  <tr key={i}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={td}><Badge color="blue" size="sm">{d.olt}</Badge></td>
                    <td style={{ ...td, fontFamily: 'var(--font-mono)' }}>{d.slot}</td>
                    <td style={{ ...td, fontFamily: 'var(--font-mono)', color: cls[0] === 'green' ? 'var(--green-text)' : cls[0] === 'blue' ? 'var(--accent-blue-text)' : cls[0] === 'amber' ? 'var(--amber-text)' : 'var(--red-text)', fontWeight: 600 }}>{d.avgRx.toFixed(2)} dBm</td>
                    <td style={td}><Badge color={cls[0]}>{cls[1]}</Badge></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

const td = { padding: '9px 16px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }
