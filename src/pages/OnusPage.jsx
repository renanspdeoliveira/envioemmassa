import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import { useApi } from '../hooks/useApi'
import { Card, Spinner, ErrorMsg, Empty, Input, Select, Btn, Badge, StatusBadge, RxBadge, PageHeader } from '../components/UI'
import { Download, Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { exportToCsv, debounce } from '../utils/helpers'

const PAGE_SIZE = 50

function fmtPhone(d) {
  if (!d) return ''
  const n = String(d).replace(/\D/g, '').replace(/^55/, '')
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`
  return d
}

export default function OnusPage() {
  const navigate = useNavigate()
  const { data: stats } = useApi(() => api.stats(), [], { refreshInterval: 30000 })

  const [filters, setFilters] = useState({ search: '', olt: '', slot: '', pon: '', status: '' })
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sort, setSort] = useState({ by: '', dir: 'asc' })
  const [page, setPage] = useState(1)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const debSearch = useCallback(debounce(v => setDebouncedSearch(v), 350), [])

  const fetchOnus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        page,
        limit: PAGE_SIZE,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(filters.olt && { olt: filters.olt }),
        ...(filters.slot && { slot: filters.slot }),
        ...(filters.pon && { pon: filters.pon }),
        ...(filters.status && { status: filters.status }),
        ...(sort.by && { sortBy: sort.by, sortDir: sort.dir }),
      }
      setResult(await api.onus(params))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, filters.olt, filters.slot, filters.pon, filters.status, sort.by, sort.dir])

  useEffect(() => { fetchOnus() }, [fetchOnus])
  useEffect(() => { setPage(1) }, [debouncedSearch, filters.olt, filters.slot, filters.pon, filters.status])
  useEffect(() => {
    const timer = setInterval(() => { fetchOnus() }, 30000)
    return () => clearInterval(timer)
  }, [fetchOnus])

  function handleSort(col) {
    setSort(s => s.by === col ? { by: col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { by: col, dir: 'asc' })
  }

  async function handleExport() {
    const params = {
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(filters.olt && { olt: filters.olt }),
      ...(filters.slot && { slot: filters.slot }),
      ...(filters.pon && { pon: filters.pon }),
      ...(filters.status && { status: filters.status }),
    }
    const { data } = await api.onuExport(params)
    exportToCsv(data, `onus_${Date.now()}.csv`)
  }

  const SortIcon = ({ col }) => {
    if (sort.by !== col) return <span style={{ color: 'var(--text-tertiary)', marginLeft: 2 }}>↕</span>
    return sort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
  }

  const th = (col) => ({
    padding: '10px 12px',
    textAlign: 'left',
    fontWeight: 500,
    fontSize: 11,
    color: 'var(--text-secondary)',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    userSelect: 'none',
    textTransform: 'uppercase',
    letterSpacing: '.05em',
  })

  const cols = [
    { key: 'OLT', label: 'OLT' },
    { key: 'Slot', label: 'GBOC' },
    { key: 'PON', label: 'PON' },
    { key: 'Nome Cliente', label: 'Cliente' },
    { key: 'Login', label: 'Login' },
    { key: 'MAC/Serial', label: 'MAC / Serial' },
    { key: 'Status ONU', label: 'Status' },
    { key: 'Sinal RX', label: 'Sinal RX' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'bairro', label: 'Bairro' },
    { key: 'Caixa FTTH/CTO', label: 'CTO' },
  ]

  const slotOptions = filters.olt ? (stats?.slotsByOlt?.[filters.olt] || []) : []
  const ponOptions = Array.from({ length: 16 }, (_, i) => i + 1)

  return (
    <div>
      <PageHeader
        title="Base de ONUs"
        subtitle={result ? `${result.total.toLocaleString('pt-BR')} equipamentos encontrados` : 'Carregando...'}
        action={(
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={fetchOnus}><RefreshCw size={14} /> Atualizar</Btn>
            <Btn onClick={handleExport} variant="primary"><Download size={14} /> Exportar CSV</Btn>
          </div>
        )}
      />

      {!!stats?.offlinePonCount && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              PONs offline detectadas: {stats.offlinePonCount}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(stats.offlinePons || []).slice(0, 12).map((ponInfo, i) => (
                <Badge key={`${ponInfo.ponId || i}`} color="red" size="sm">
                  {ponInfo.olt} · G{ponInfo.slot ?? '-'} · P{ponInfo.pon ?? '-'}
                </Badge>
              ))}
            </div>
          </div>
        </Card>
      )}

      <Card style={{ marginBottom: 16 }}>
        <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '0 0 280px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
            <Input
              placeholder="Buscar nome, login, MAC, CTO... (qualquer letra)"
              style={{ paddingLeft: 32, width: '100%' }}
              value={filters.search}
              onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); debSearch(e.target.value) }}
            />
          </div>

          <Select value={filters.olt} onChange={e => setFilters(f => ({ ...f, olt: e.target.value, slot: '', pon: '' }))}>
            <option value="">Todas OLTs</option>
            {(stats?.olts || []).map(o => <option key={o}>{o}</option>)}
          </Select>

          <Select value={filters.slot} onChange={e => setFilters(f => ({ ...f, slot: e.target.value, pon: '' }))} disabled={!filters.olt}>
            <option value="">Todos GBOCs</option>
            {slotOptions.map(s => <option key={s} value={s}>GBOC {s}</option>)}
          </Select>

          <Select value={filters.pon} onChange={e => setFilters(f => ({ ...f, pon: e.target.value }))} disabled={!filters.slot}>
            <option value="">Todas PONs</option>
            {ponOptions.map(p => <option key={p} value={p}>PON {p}</option>)}
          </Select>

          <Select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="">Todos status</option>
            <option>Autorizada</option>
            <option>Pedindo autenticacao</option>
            <option>Sem status</option>
          </Select>

          {(filters.search || filters.olt || filters.slot || filters.pon || filters.status) && (
            <Btn onClick={() => { setFilters({ search: '', olt: '', slot: '', pon: '', status: '' }); setDebouncedSearch('') }}>
              ✕ Limpar
            </Btn>
          )}
        </div>
      </Card>

      <Card>
        {loading ? <Spinner /> : error ? <ErrorMsg message={error} /> : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {cols.map(c => (
                      <th key={c.key} style={th(c.key)} onClick={() => handleSort(c.key)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {c.label} <SortIcon col={c.key} />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result?.data?.length === 0 ? (
                    <tr><td colSpan={cols.length}><Empty /></td></tr>
                  ) : result?.data?.map((row, i) => (
                    <tr
                      key={i}
                      onClick={() => row['MAC/Serial'] && navigate(`/onus/${encodeURIComponent(row['MAC/Serial'])}`)}
                      style={{ cursor: row['MAC/Serial'] ? 'pointer' : 'default' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <td style={td}><Badge color="blue" size="sm">{row.OLT}</Badge></td>
                      <td style={td}><span style={mono}>{row.Slot}</span></td>
                      <td style={td}><span style={mono}>{row.PON}</span></td>
                      <td style={{ ...td, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <span style={{ fontWeight: 500 }}>{row.nome_formatado || row['Nome Cliente'] || '—'}</span>
                      </td>
                      <td style={td}><span style={mono}>{row.Login || '—'}</span></td>
                      <td style={td}><span style={{ ...mono, fontSize: 11, color: 'var(--text-secondary)' }}>{row['MAC/Serial'] || '—'}</span></td>
                      <td style={td}><StatusBadge status={row['Status ONU']} /></td>
                      <td style={td}><RxBadge value={row['Sinal RX']} /></td>
                      <td style={td}>
                        {row.whatsapp
                          ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--green-text)' }}>{fmtPhone(row.whatsapp)}</span>
                          : <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>—</span>}
                      </td>
                      <td style={td}>
                        {row.bairro
                          ? <Badge color="green" size="sm">{row.bairro}</Badge>
                          : <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>—</span>}
                      </td>
                      <td style={{ ...td, fontSize: 12, color: 'var(--text-secondary)' }}>{row['Caixa FTTH/CTO'] || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result && result.pages > 1 && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Página {result.page} de {result.pages} — {result.total.toLocaleString('pt-BR')} resultados
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Btn onClick={() => setPage(1)} disabled={page === 1}>«</Btn>
                  <Btn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft size={14} /></Btn>
                  {Array.from({ length: Math.min(5, result.pages) }, (_, i) => {
                    const p = Math.max(1, Math.min(result.pages - 4, page - 2)) + i
                    return <Btn key={p} onClick={() => setPage(p)} variant={p === page ? 'primary' : 'default'}>{p}</Btn>
                  })}
                  <Btn onClick={() => setPage(p => Math.min(result.pages, p + 1))} disabled={page === result.pages}><ChevronRight size={14} /></Btn>
                  <Btn onClick={() => setPage(result.pages)} disabled={page === result.pages}>»</Btn>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}

const td = { padding: '9px 12px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)', whiteSpace: 'nowrap' }
const mono = { fontFamily: 'var(--font-mono)', fontSize: 12 }
