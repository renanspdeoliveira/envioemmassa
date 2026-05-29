import { useMemo, useState } from 'react'
import { useApi } from '../hooks/useApi'
import { api } from '../utils/api'
import { Card, CardHeader, Spinner, PageHeader, Badge, RxBadge } from '../components/UI'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
      {label && <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || 'var(--text-primary)' }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString('pt-BR') : p.value}</strong>
        </div>
      ))}
    </div>
  )
}

const SIGNAL_COLORS = {
  excelente: '#56d364',
  bom: '#58a6ff',
  regular: '#e3b341',
  ruim: '#ff7b72',
  semLeitura: '#8b949e',
}

const BAND_KEY_BY_LABEL = {
  'Excelente (> -20)': 'excelente',
  'Bom (-20 a -24)': 'bom',
  'Regular (-24 a -27)': 'regular',
  'Ruim (< -27)': 'ruim',
  'Sem leitura': 'semLeitura',
}

function getSignalBand(value) {
  const rx = Number(value)
  if (!value || value === 0 || !Number.isFinite(rx)) return 'semLeitura'
  if (rx > -20) return 'excelente'
  if (rx >= -24) return 'bom'
  if (rx >= -27) return 'regular'
  return 'ruim'
}

function normalizeDistribution(data) {
  const map = {
    'Excelente (> -20)': { label: 'Excelente', hint: '> -20 dBm', color: SIGNAL_COLORS.excelente },
    'Bom (-20 a -24)': { label: 'Bom', hint: '-20 a -24 dBm', color: SIGNAL_COLORS.bom },
    'Regular (-24 a -27)': { label: 'Regular', hint: '-24 a -27 dBm', color: SIGNAL_COLORS.regular },
    'Ruim (< -27)': { label: 'Ruim', hint: '< -27 dBm', color: SIGNAL_COLORS.ruim },
    'Sem leitura': { label: 'Sem leitura', hint: 'RX zerado ou vazio', color: SIGNAL_COLORS.semLeitura },
  }

  return (data || []).map(item => ({
    ...item,
    shortLabel: map[item.label]?.label || item.label,
    hint: map[item.label]?.hint || '',
    color: map[item.label]?.color || SIGNAL_COLORS.semLeitura,
  }))
}

export default function SinalPage() {
  const [activeBand, setActiveBand] = useState('')
  const { data: stats, loading: l0 } = useApi(() => api.stats())
  const { data: rxDist, loading: l1 } = useApi(() => api.chartRxDist())
  const { data: vlanData, loading: l2 } = useApi(() => api.chartVlan())
  const { data: onuExport, loading: l3 } = useApi(() => api.onuExport())

  const distData = normalizeDistribution(rxDist)
  const totalBase = stats?.total || distData.reduce((sum, item) => sum + (item.count || 0), 0)
  const allOnus = onuExport?.data || []

  const filteredOnus = useMemo(() => {
    if (!activeBand) return []

    return allOnus
      .filter((row) => getSignalBand(row['Sinal RX']) === activeBand)
      .sort((a, b) => {
        const arx = Number(a['Sinal RX'] || 0)
        const brx = Number(b['Sinal RX'] || 0)
        if (activeBand === 'ruim') return arx - brx
        if (activeBand === 'semLeitura') return String(a['Nome Cliente'] || '').localeCompare(String(b['Nome Cliente'] || ''))
        return brx - arx
      })
  }, [activeBand, allOnus])

  if (l0 || l1 || l2 || l3) return <Spinner />

  return (
    <div>
      <PageHeader
        title="Analise de Sinal"
        subtitle="Leitura rapida da qualidade optica da rede"
      />

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        {distData.map(item => (
          <div key={item.shortLabel} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
            <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-primary)' }}>{item.shortLabel}</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.hint}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16 }}>
        <Card>
          <CardHeader title="Distribuicao por qualidade de sinal" subtitle={`Base considerada: ${totalBase.toLocaleString('pt-BR')} ONUs`} />
          <div style={{ padding: '12px 8px' }}>
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={distData} layout="vertical" margin={{ top: 4, right: 16, left: 18, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="shortLabel" width={92} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} formatter={(v) => [v, 'ONUs']} />
                <Bar dataKey="count" name="ONUs" radius={[0, 4, 4, 0]}>
                  {distData.map((item) => <Cell key={item.shortLabel} fill={item.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Resumo das faixas" subtitle={`Percentual sobre ${totalBase.toLocaleString('pt-BR')} ONUs`} />
          <div style={{ padding: 16, display: 'grid', gap: 10 }}>
            {distData.map(item => (
              <button
                key={item.shortLabel}
                onClick={() => setActiveBand((current) => current === BAND_KEY_BY_LABEL[item.label] ? '' : BAND_KEY_BY_LABEL[item.label])}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '12px 14px',
                  border: `1px solid ${activeBand === BAND_KEY_BY_LABEL[item.label] ? item.color : 'var(--border)'}`,
                  borderRadius: 10,
                  background: activeBand === BAND_KEY_BY_LABEL[item.label] ? 'rgba(255,255,255,0.04)' : 'var(--bg-tertiary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{item.shortLabel}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {item.hint} · {totalBase ? ((item.count / totalBase) * 100).toFixed(1).replace('.', ',') : '0,0'}%
                    </div>
                  </div>
                </div>
                <Badge color="blue" size="sm">{item.count.toLocaleString('pt-BR')} / {totalBase.toLocaleString('pt-BR')}</Badge>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {activeBand && (
        <Card style={{ marginTop: 16 }}>
          <CardHeader
            title={`Clientes - ${distData.find((item) => BAND_KEY_BY_LABEL[item.label] === activeBand)?.shortLabel || ''}`}
            subtitle={`${filteredOnus.length.toLocaleString('pt-BR')} ONUs`}
            action={<Badge color="blue">{filteredOnus.length.toLocaleString('pt-BR')}</Badge>}
          />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Cliente', 'PON', 'MAC/Serial', 'Sinal RX'].map((header) => (
                    <th key={header} style={th}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOnus.slice(0, 300).map((row, index) => (
                  <tr key={`${row['MAC/Serial'] || row.Login || index}`}>
                    <td style={{ ...td, minWidth: 240 }}>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{row['Nome Cliente'] || 'Sem cliente'}</div>
                    </td>
                    <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{row['PON ID'] || '-'}</td>
                    <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>{row['MAC/Serial'] || '-'}</td>
                    <td style={td}><RxBadge value={row['Sinal RX']} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredOnus.length > 300 && (
              <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                Mostrando os primeiros 300 clientes da faixa selecionada.
              </div>
            )}
          </div>
        </Card>
      )}

      <Card style={{ marginTop: 16 }}>
        <CardHeader title="ONUs por VLAN" subtitle="Top 15 VLANs mais utilizadas" />
        <div style={{ padding: '12px 8px' }}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={vlanData || []} margin={{ top: 4, right: 16, left: -10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="vlan" tick={{ fill: 'var(--text-secondary)', fontSize: 11, angle: -25, textAnchor: 'end' }} axisLine={false} tickLine={false} interval={0} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} formatter={(v) => [v, 'ONUs']} />
              <Bar dataKey="count" name="ONUs" radius={[4, 4, 0, 0]}>
                {(vlanData || []).map((_, i) => <Cell key={i} fill={`hsl(${210 - i * 8}, 60%, ${55 - i}%)`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}

const th = {
  padding: '9px 12px',
  textAlign: 'left',
  fontSize: 11,
  color: 'var(--text-secondary)',
  background: 'var(--bg-secondary)',
  borderBottom: '1px solid var(--border)',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '.05em',
  whiteSpace: 'nowrap',
}

const td = {
  padding: '9px 12px',
  borderBottom: '1px solid var(--border-subtle)',
  color: 'var(--text-primary)',
  whiteSpace: 'nowrap',
}
