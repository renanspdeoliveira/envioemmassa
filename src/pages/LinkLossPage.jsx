import { useState } from 'react'
import { AlertTriangle, RefreshCw, Unplug, WifiOff } from 'lucide-react'
import { Badge, Btn, Card, CardHeader, Empty, ErrorMsg, PageHeader, Spinner } from '../components/UI'
import { useApi } from '../hooks/useApi'
import { api } from '../utils/api'

const TAB_META = {
  linkLoss: {
    label: '400 - Link Loss',
    badge: 'red',
    icon: AlertTriangle,
    empty: 'Nenhuma ONU com Link Loss no momento',
  },
  dyingGasp: {
    label: '402 - Dying Gasp',
    badge: 'amber',
    icon: Unplug,
    empty: 'Nenhuma ONU com Dying Gasp no momento',
  },
  onuOffline: {
    label: '403 - ONU Offline',
    badge: 'gray',
    icon: WifiOff,
    empty: 'Nenhuma ONU classificada como offline no momento',
  },
}

export default function LinkLossPage() {
  const { data, loading, error, refetch, refreshing } = useApi(() => api.clientsLinkloss(), [], { refreshInterval: 5000 })
  const [activeTab, setActiveTab] = useState('linkLoss')

  const summary = data?.summary || {}
  const causes = data?.causes || {}
  const groups = data?.groups || {}

  const rows = groups[activeTab] || []
  const lastSourceUpdate = data?.sourceUpdatedAt || data?.fetchedAt || null

  if (loading) return <Spinner />
  if (error) return <ErrorMsg message={error} />

  return (
    <div>
      <PageHeader
        title="Link Loss"
        subtitle={`${Number(summary.totalMonitorados || 0).toLocaleString('pt-BR')} eventos monitorados no Zabbix com atualizacao automatica a cada 5 segundos`}
        action={(
          <div style={{ display: 'flex', gap: 8 }}>
            {data?.stale ? <Badge color="amber">Cache antigo</Badge> : null}
            {refreshing ? <Badge color="blue">Atualizando...</Badge> : null}
            <Btn onClick={refetch}>
              <RefreshCw size={14} />
              Atualizar
            </Btn>
          </div>
        )}
      />

      <div style={summaryGrid}>
        <SummaryCard
          label="Link Loss"
          value={causes.linkLoss?.quantidade || 0}
          sub="Codigo 400"
          color="red"
          icon={AlertTriangle}
          active={activeTab === 'linkLoss'}
          onClick={() => setActiveTab('linkLoss')}
        />
        <SummaryCard
          label="Dying Gasp"
          value={causes.dyingGasp?.quantidade || 0}
          sub="Codigo 402"
          color="amber"
          icon={Unplug}
          active={activeTab === 'dyingGasp'}
          onClick={() => setActiveTab('dyingGasp')}
        />
        <SummaryCard
          label="ONU Offline"
          value={causes.onuOffline?.quantidade || 0}
          sub="Codigo 403"
          color="gray"
          icon={WifiOff}
          active={activeTab === 'onuOffline'}
          onClick={() => setActiveTab('onuOffline')}
        />
      </div>

      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Guias" subtitle={lastSourceUpdate ? `Ultima atualizacao do Zabbix: ${formatDate(lastSourceUpdate)}` : 'Escolha a causa para ver a lista detalhada'} />
        <div style={tabsWrap}>
          {Object.entries(TAB_META).map(([key, meta]) => (
            <TabButton
              key={key}
              active={activeTab === key}
              label={meta.label}
              badgeColor={meta.badge}
              count={(groups[key] || []).length}
              icon={meta.icon}
              onClick={() => setActiveTab(key)}
            />
          ))}
        </div>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <CardHeader title={TAB_META[activeTab].label} subtitle={`${rows.length.toLocaleString('pt-BR')} registros nesta guia`} />
        {!rows.length ? (
          <Empty message={TAB_META[activeTab].empty} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Cliente', 'WhatsApp', 'MAC/Serial', 'Login/Contrato', 'OLT/PON', 'Tempo desde a queda', 'Atualizacao'].map((header) => (
                    <th key={header} style={th}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.serial || 'sem-serial'}-${row.eventTs || index}-${index}`}>
                    <td style={{ ...td, minWidth: 220 }}>
                      <div style={{ fontWeight: 700, color: row.displayNameAlert ? 'var(--red-text)' : 'var(--text-primary)' }}>
                        {row.nomeCliente || 'Cliente nao localizado'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                        {row.causa || TAB_META[activeTab].label}
                      </div>
                      {(row.recoveredDropsToday || 0) > 0 ? (
                        <div style={{ fontSize: 11, color: 'var(--red-text)', marginTop: 4, fontWeight: 700 }}>
                          {row.recoveredDropsToday} queda{row.recoveredDropsToday > 1 ? 's' : ''} acumulada{row.recoveredDropsToday > 1 ? 's' : ''} hoje
                        </div>
                      ) : null}
                    </td>
                    <td style={td}>
                      <div style={{ ...mono, color: row.whatsapp ? 'var(--green-text)' : 'var(--text-tertiary)' }}>
                        {formatPhone(row.whatsapp)}
                      </div>
                    </td>
                    <td style={td}>
                      <div style={mono}>{row.serial || '-'}</div>
                    </td>
                    <td style={{ ...td, minWidth: 170 }}>
                      <div style={{ color: 'var(--text-primary)' }}>{row.login || '-'}</div>
                      <div style={{ ...mono, marginTop: 4, color: 'var(--text-secondary)' }}>
                        Contrato {row.idContrato || '-'}
                      </div>
                    </td>
                    <td style={{ ...td, minWidth: 180 }}>
                      <div>{row.oltPonLabel || formatOltPon(row)}</div>
                    </td>
                    <td style={td}>
                      <div style={mono}>{formatDurationSince(row.data_desconexao || row.horario_queda)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                        {formatDate(row.data_desconexao || row.horario_queda)}
                      </div>
                    </td>
                    <td style={td}><span style={mono}>{formatDate(row.ultima_atualizacao)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function SummaryCard({ label, value, sub, icon: Icon, color, active = false, onClick }) {
  const palette = {
    red: { bg: 'var(--red-subtle)', text: 'var(--red-text)', border: '#4a1f1f' },
    amber: { bg: 'var(--amber-subtle)', text: 'var(--amber-text)', border: '#4a3010' },
    gray: { bg: 'var(--bg-tertiary)', text: 'var(--text-primary)', border: 'var(--border)' },
    blue: { bg: 'var(--accent-blue-subtle)', text: 'var(--accent-blue-text)', border: '#1f3a5f' },
  }[color]

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${active ? palette.text : palette.border}`,
        borderRadius: 'var(--radius-lg)',
        padding: '16px 18px',
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: palette.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={palette.text} />
        </div>
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, color: palette.text }}>{Number(value || 0).toLocaleString('pt-BR')}</div>
      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>{sub}</div>
    </button>
  )
}

function TabButton({ active, label, badgeColor, count, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={tabBtn(active)}
    >
      <Icon size={15} />
      {label}
      <Badge color={badgeColor} size="sm">{count}</Badge>
    </button>
  )
}

function formatDate(value) {
  if (!value) return '-'
  return String(value)
}

function formatPhone(value) {
  if (!value) return '-'
  const digits = String(value).replace(/\D/g, '').replace(/^55/, '')
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return value
}

function formatOltPon(row) {
  const posicao = String(row?.posicao || row?.pon_onu || '').trim()
  const parts = posicao.split('/').map((part) => part.trim()).filter(Boolean)
  if (parts.length >= 3) return `OLT ${parts[0]} - PON ${parts[1]}/${parts[2]}`
  if (parts.length === 2) return `OLT ${parts[0]} - PON ${parts[1]}`
  return posicao || '-'
}

function formatDurationSince(value) {
  const parsed = parseEventDate(value)
  if (!parsed) return '-'

  const diffMs = Math.max(0, Date.now() - parsed.getTime())
  const totalMinutes = Math.floor(diffMs / 60000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  return `${days}d ${hours}h ${minutes}m`
}

function parseEventDate(value) {
  const raw = String(value || '').trim()
  if (!raw || raw === 'Nao identificado' || raw === 'Não identificado') return null
  const normalized = raw.replace(' - ', 'T').replace(' ', 'T')
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

const summaryGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 14,
  marginBottom: 16,
}

const tabsWrap = {
  padding: '14px 16px',
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
}

const tabBtn = (active) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 14px',
  borderRadius: 999,
  border: `1px solid ${active ? 'rgba(88, 166, 255, 0.34)' : 'var(--border)'}`,
  background: active
    ? 'linear-gradient(135deg, rgba(31, 111, 235, 0.92), rgba(88, 166, 255, 0.72))'
    : 'var(--bg-tertiary)',
  color: active ? '#fff' : 'var(--text-primary)',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
})

const th = {
  padding: '10px 12px',
  textAlign: 'left',
  fontWeight: 500,
  fontSize: 11,
  color: 'var(--text-secondary)',
  background: 'var(--bg-secondary)',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
  textTransform: 'uppercase',
  letterSpacing: '.05em',
}

const td = {
  padding: '10px 12px',
  borderBottom: '1px solid var(--border-subtle)',
  color: 'var(--text-primary)',
  verticalAlign: 'top',
  whiteSpace: 'nowrap',
}

const mono = {
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
}
