import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import { useApi } from '../hooks/useApi'
import { Card, Spinner, ErrorMsg, Empty, Input, Select, Btn, Badge, StatusBadge, PageHeader } from '../components/UI'
import { Database, Download, Link as LinkIcon, RefreshCw, Search, WifiOff } from 'lucide-react'
import { exportToCsv } from '../utils/helpers'

const PAGE_SIZE = 50
const MS_20H = 20 * 60 * 60 * 1000
const MS_24H = 24 * 60 * 60 * 1000

export default function Clientes24hOfflinePage() {
  const navigate = useNavigate()
  const { data: result, loading, error, refetch } = useApi(() => api.clients24hOffline(), [], { refreshInterval: 30000 })
  const [search, setSearch] = useState('')
  const [ativo, setAtivo] = useState('')
  const [onuStatus, setOnuStatus] = useState('')
  const [faixaOffline, setFaixaOffline] = useState('24plus')
  const [page, setPage] = useState(1)

  const rows = result?.data || []
  const summary = result?.summary || {}

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()

    return rows.filter((row) => {
      if (ativo && row.ativo !== ativo) return false
      if (onuStatus && row.onuStatus !== onuStatus) return false
      if (faixaOffline === 'hoje' && row.faixaOffline !== 'hoje') return false
      if (faixaOffline === '20plus' && row.offlineMs < MS_20H) return false
      if (faixaOffline === '24plus' && row.offlineMs < MS_24H) return false
      if (!query) return true

      return [
        row.login,
        row.id,
        row.contrato,
        row.ponId,
        row.macSerial,
        row.nomeCliente,
        row.olt,
        row.whatsapp,
      ].some((value) => String(value || '').toLowerCase().includes(query))
    })
  }, [rows, search, ativo, onuStatus, faixaOffline])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const availableOnuStatuses = useMemo(() => {
    return [...new Set(rows.map((row) => row.onuStatus).filter(Boolean))].sort()
  }, [rows])

  function resetFilters() {
    setSearch('')
    setAtivo('')
    setOnuStatus('')
    setFaixaOffline('24plus')
    setPage(1)
  }

  function handleOpenOnu(row) {
    if (!row.macSerial) return
    navigate(`/onus/${encodeURIComponent(row.macSerial)}`)
  }

  function handleExportCsv() {
    const rowsToExport = rows
      .filter((row) => row.offlineMs >= MS_24H)
      .filter((row) => row.whatsapp)
      .map((row) => ({
        name: row.nomeCliente || row.login || 'Sem nome',
        whatsapp: fmtPhoneCsv(row.whatsapp),
      }))

    exportToCsv(rowsToExport, `clientes_24h_mais_${Date.now()}.csv`)
  }

  return (
    <div>
      <PageHeader
        title="Clientes 24h Offline"
        subtitle={result ? `${filteredRows.length.toLocaleString('pt-BR')} clientes no filtro atual` : 'Carregando...'}
        action={(
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={refetch}>
              <RefreshCw size={14} />
              Atualizar
            </Btn>
            <Btn
              variant="primary"
              onClick={handleExportCsv}
              disabled={!rows.some((row) => row.offlineMs >= MS_24H && row.whatsapp)}
            >
              <Download size={14} />
              Exportar CSV 24+
            </Btn>
          </div>
        )}
      />

      {loading ? <Spinner /> : error ? <ErrorMsg message={error} /> : (
        <>
          <div style={summaryGrid}>
            <SummaryCard
              label="Offline Hoje"
              value={summary.totalHoje ?? 0}
              sub={`ultima conexao desde ${summary.referenciaHoje || '-'}`}
              icon={WifiOff}
              color="red"
              active={faixaOffline === 'hoje'}
              onClick={() => { setFaixaOffline('hoje'); setPage(1) }}
            />
            <SummaryCard
              label="Offline"
              value={summary.total20h ?? 0}
              sub={`mais de 20h offline · ativos ${summary.ativos20h ?? 0}`}
              icon={LinkIcon}
              color="blue"
              active={faixaOffline === '20plus'}
              onClick={() => { setFaixaOffline('20plus'); setPage(1) }}
            />
            <SummaryCard
              label="Clientes 24+"
              value={summary.total24h ?? rows.length}
              sub={`offline desde pelo menos ${summary.referencia24hData || '-'}`}
              icon={Database}
              color="amber"
              active={faixaOffline === '24plus'}
              onClick={() => { setFaixaOffline('24plus'); setPage(1) }}
            />
            <SummaryCard
              label="Mais Antigo 24h+"
              value={summary.maisAntigo24h?.ultimaConexaoFmt || '-'}
              sub={summary.maisAntigo24h
                ? `${summary.maisAntigo24h.login || 'Sem login'} · ${summary.maisAntigo24h.tempoOffline}`
                : 'sem cliente acima de 24h no momento'}
              icon={Database}
              color="green"
            />
          </div>

          <Card style={{ marginBottom: 16 }}>
            <div style={highlightWrap}>
              <div>
                <div style={highlightLabel}>
                  {faixaOffline === 'hoje' ? 'Offline Hoje' : faixaOffline === '20plus' ? 'Offline' : 'Clientes 24+'}
                </div>
                <div style={highlightText}>
                  {faixaOffline === 'hoje' && (
                    <>Esta lista mostra apenas clientes offline cuja ultima conexao foi hoje, desde <strong>{summary.referenciaHojeDataHora || '-'}</strong>.</>
                  )}
                  {faixaOffline === '20plus' && (
                    <>Esta lista mostra apenas clientes com mais de <strong>20 horas offline</strong>, desde <strong>{summary.referencia20hDataHora || '-'}</strong>.</>
                  )}
                  {faixaOffline === '24plus' && (
                    <>Esta lista mostra apenas clientes que continuam offline desde <strong>{summary.referencia24hDataHora || '-'}</strong> ou antes.</>
                  )}
                </div>
              </div>
              <Badge color={faixaOffline === 'hoje' ? 'red' : faixaOffline === '20plus' ? 'blue' : 'amber'}>
                {(faixaOffline === 'hoje'
                  ? (summary.totalHoje ?? 0)
                  : faixaOffline === '20plus'
                    ? (summary.total20h ?? 0)
                    : (summary.total24h ?? rows.length)
                ).toLocaleString('pt-BR')} clientes
              </Badge>
            </div>
          </Card>

          <Card style={{ marginBottom: 16 }}>
            <div style={filtersWrap}>
              <div style={{ position: 'relative', flex: '1 1 320px' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
                <Input
                  placeholder="Buscar login, contrato, PON ID, MAC, WhatsApp..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  style={{ width: '100%', paddingLeft: 32 }}
                />
              </div>

              <Select value={ativo} onChange={(e) => { setAtivo(e.target.value); setPage(1) }}>
                <option value="">Todos ativos</option>
                <option value="Ativo">Ativo</option>
                <option value="Nao ativo">Nao ativo</option>
                <option value="Indefinido">Indefinido</option>
              </Select>

              <Select value={onuStatus} onChange={(e) => { setOnuStatus(e.target.value); setPage(1) }}>
                <option value="">Todos status ONU</option>
                {availableOnuStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </Select>

              {(search || ativo || onuStatus || faixaOffline !== '24plus') && (
                <Btn onClick={resetFilters}>Limpar</Btn>
              )}
            </div>
          </Card>

          <Card>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Login', 'Contrato', 'Ativo', 'Online', 'Status ONU', 'OLT/GBOC/PON', 'Tempo Offline', 'Data original', 'WhatsApp', 'MAC/Serial'].map((col) => (
                      <th key={col} style={th}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 ? (
                    <tr><td colSpan={10}><Empty message="Nenhum cliente offline encontrado com os filtros atuais" /></td></tr>
                  ) : pageRows.map((row) => (
                    <tr
                      key={`${row.id}-${row.login}-${row.ultimaConexao}`}
                      onClick={() => handleOpenOnu(row)}
                      style={{ cursor: row.macSerial ? 'pointer' : 'default' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <td style={{ ...td, minWidth: 180, maxWidth: 220 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.login || 'Sem login'}</div>
                        {row.nomeCliente ? <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>{row.nomeCliente}</div> : null}
                      </td>
                      <td style={td}><span style={mono}>{row.contrato || '-'}</span></td>
                      <td style={td}><Badge color={row.ativo === 'Ativo' ? 'green' : row.ativo === 'Nao ativo' ? 'red' : 'gray'}>{row.ativo}</Badge></td>
                      <td style={td}><Badge color={row.onlineRadius === 'Online' ? 'green' : row.onlineRadius === 'Offline' ? 'red' : 'gray'}>{row.onlineRadius}</Badge></td>
                      <td style={td}>
                        {row.onuStatus === 'Autorizada' || row.onuStatus === 'Pedindo autenticacao' || row.onuStatus === 'Sem status'
                          ? <StatusBadge status={row.onuStatus} />
                          : <Badge color={row.onuEncontrada ? 'gray' : 'amber'}>{row.onuStatus}</Badge>}
                      </td>
                      <td style={td}>
                        <span style={{ color: 'var(--text-primary)' }}>{row.olt || '-'}</span>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>
                          GBOC {row.slot ?? '-'} | PON {row.pon ?? '-'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>
                          PON ID {row.ponId || '-'}
                        </div>
                      </td>
                      <td style={td}><Badge color="red">{row.tempoOffline}</Badge></td>
                      <td style={td}><span style={mono}>{row.ultimaConexao || '-'}</span></td>
                      <td style={td}>
                        <span style={{ ...mono, color: row.whatsapp ? 'var(--green-text)' : 'var(--text-tertiary)' }}>
                          {fmtPhone(row.whatsapp)}
                        </span>
                      </td>
                      <td style={td}><span style={{ ...mono, color: row.macSerial ? 'var(--accent-blue-text)' : 'var(--text-tertiary)' }}>{row.macSerial || '-'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredRows.length > PAGE_SIZE && (
              <div style={paginationWrap}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Pagina {currentPage} de {totalPages} · {filteredRows.length.toLocaleString('pt-BR')} resultados
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</Btn>
                  <Btn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Proxima</Btn>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}

function SummaryCard({ label, value, sub, icon: Icon, color, active = false, onClick }) {
  const palette = {
    red: { bg: 'var(--red-subtle)', text: 'var(--red-text)' },
    amber: { bg: 'var(--amber-subtle)', text: 'var(--amber-text)' },
    blue: { bg: 'var(--accent-blue-subtle)', text: 'var(--accent-blue-text)' },
    green: { bg: 'var(--green-subtle)', text: 'var(--green-text)' },
  }[color]

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${active ? palette.text : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '16px 18px',
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: active ? `0 0 0 1px ${palette.text} inset` : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
        <div style={{ width: 30, height: 30, borderRadius: 10, background: palette.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} color={palette.text} />
        </div>
      </div>
      <div style={{ fontSize: 30, lineHeight: 1, fontWeight: 700, color: palette.text }}>{Number(value || 0).toLocaleString('pt-BR')}</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>{sub}</div>
    </button>
  )
}

function fmtPhone(value) {
  if (!value) return '-'
  const digits = String(value).replace(/\D/g, '').replace(/^55/, '')
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return value
}

function fmtPhoneCsv(value) {
  const digits = String(value || '').replace(/\D/g, '').replace(/^55/, '')
  if (digits.length === 11) return `${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `${digits.slice(0, 2)} ${digits.slice(2, 6)}-${digits.slice(6)}`
  return value || ''
}

const summaryGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 14,
  marginBottom: 16,
}

const filtersWrap = {
  padding: '12px 16px',
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
  alignItems: 'center',
}

const highlightWrap = {
  padding: '14px 16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  flexWrap: 'wrap',
}

const highlightLabel = {
  fontSize: 12,
  color: 'var(--amber-text)',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '.06em',
  marginBottom: 6,
}

const highlightText = {
  fontSize: 13,
  color: 'var(--text-secondary)',
}

const paginationWrap = {
  padding: '12px 16px',
  borderTop: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
}

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
  padding: '9px 12px',
  borderBottom: '1px solid var(--border-subtle)',
  color: 'var(--text-primary)',
  whiteSpace: 'nowrap',
  verticalAlign: 'top',
}

const mono = {
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
}
