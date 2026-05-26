import { useState, useCallback, useRef } from 'react'
import { useApi } from '../hooks/useApi'
import { api, apiEnvio, apiRelatorio } from '../utils/api'
import { Card, CardHeader, Spinner, ErrorMsg, Empty, Input, Select, Btn, Badge, PageHeader, StatusBadge } from '../components/UI'
import { Download, Send, Filter, Search, CheckSquare, Square, X, Info, Phone, AlertTriangle, Upload } from 'lucide-react'
import { debounce } from '../utils/helpers'

function fmtPhone(d) {
  if (!d) return ''
  const n = String(d).replace(/\D/g,'').replace(/^55/,'')
  if (n.length === 11) return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`
  if (n.length === 10) return `(${n.slice(0,2)}) ${n.slice(2,6)}-${n.slice(6)}`
  return d
}

export default function EnvioMassaPage() {
  const { data: stats }  = useApi(() => api.stats())
  const { data: bairros } = useApi(() => apiEnvio.bairrosList())

  const [filters, setFilters] = useState({ olt:'', slot:'', pon:'', bairro:'', status:'', search:'' })
  const [dSearch, setDSearch] = useState('')
  const debSearch = useCallback(debounce(v => setDSearch(v), 350), [])
  const [somenteComContato, setSomenteComContato] = useState(false)

  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [editModal, setEditModal] = useState(null)

  // Relatorio upload
  const relFileRef    = useRef()
  const loginsFileRef = useRef()
  const [relMsg, setRelMsg] = useState(null)

  const activeFilters = [filters.olt, filters.slot, filters.pon, filters.bairro, filters.status, dSearch].some(Boolean)

  const fetchData = useCallback(async () => {
    if (!activeFilters) { setResult(null); return }
    setLoading(true); setError(null)
    try {
      const params = {}
      if (filters.olt)    params.olt    = filters.olt
      if (filters.slot)   params.slot   = filters.slot
      if (filters.pon)    params.pon    = filters.pon
      if (filters.bairro) params.bairro = filters.bairro
      if (filters.status) params.status = filters.status
      if (dSearch)        params.search = dSearch
      const data = await apiEnvio.list(params)
      setResult(data)
      setSelected(new Set())
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }, [filters.olt, filters.slot, filters.pon, filters.bairro, filters.status, dSearch])

  function rows() {
    if (!result?.data) return []
    return somenteComContato ? result.data.filter(r => r.whatsapp) : result.data
  }

  function toggleAll() {
    const r = rows()
    setSelected(selected.size === r.length ? new Set() : new Set(r.map((_,i) => i)))
  }
  function toggleRow(i) {
    const s = new Set(selected); s.has(i) ? s.delete(i) : s.add(i); setSelected(s)
  }

  // Export CSV — ONLY name,whatsapp (OpaSuite format)
  function exportRows() {
    const r = rows()
    const toExport = selected.size > 0 ? r.filter((_,i) => selected.has(i)) : r
    if (!toExport.length) return

    // Format phone: 5516991234567 → (16) 99123-4567
    function fmtPhoneExport(raw) {
      if (!raw) return ''
      const d = String(raw).replace(/\D/g, '').replace(/^55/, '')
      if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
      if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
      return raw
    }

    const csv = [
      'name,whatsapp',
      ...toExport.map(r => {
        const name = r.nome_formatado || ''
        const phone = fmtPhoneExport(r.whatsapp)
        // Quote name if it contains comma
        const nameSafe = name.includes(',') ? `"${name}"` : name
        return `${nameSafe},${phone}`
      })
    ].join('\r\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `envio_massa_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleRelatorioUpload(e) {
    const file = e.target.files?.[0]; if (!file) return
    setRelMsg(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/relatorio/upload', { method: 'POST', body: form }).then(r => r.json())
      setRelMsg({ ok: true, msg: `✓ ${res.contratos || res.imported || 0} contratos · ${res.comTelefone || res.withPhone || 0} com telefone` })
      if (result) fetchData()
    } catch(err) { setRelMsg({ ok: false, msg: 'Erro: ' + err.message }) }
    e.target.value = ''
  }

  async function handleLoginsUpload(e) {
    const file = e.target.files?.[0]; if (!file) return
    setRelMsg(null)
    try {
      const form = new FormData()
      form.append('logins', file)
      const res = await fetch('/api/relatorio/upload', { method: 'POST', body: form }).then(r => r.json())
      setRelMsg({ ok: true, msg: `✓ ${res.logins || 0} logins vinculados · ${res.comTelefone || 0} com telefone` })
      if (result) fetchData()
    } catch(err) { setRelMsg({ ok: false, msg: 'Erro: ' + err.message }) }
    e.target.value = ''
  }

  const r = rows()
  const comContato   = result?.data?.filter(r => r.whatsapp).length  || 0
  const semContato   = (result?.data?.length || 0) - comContato

  return (
    <div>
      <PageHeader
        title="Envio em Massa"
        subtitle="Selecione clientes por PON ou bairro e exporte para disparos via WhatsApp"
        action={result && (
          <Btn onClick={exportRows} variant="primary">
            <Download size={14} />
            Exportar CSV {selected.size > 0 ? `(${selected.size})` : `(${r.length})`}
          </Btn>
        )}
      />

      {/* Relatorio import strip */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ padding: '12px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <Phone size={14} style={{ color:'var(--green-text)', flexShrink:0 }} />
            <span style={{ fontSize:13, fontWeight:500 }}>Base de Contratos</span>
            {stats?.totalContratos > 0 && (
              <Badge color="green" size="sm">
                {stats.totalContratos.toLocaleString('pt-BR')} contratos · {stats.comTelefone?.toLocaleString('pt-BR')} com telefone
              </Badge>
            )}
          </div>
          <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap', alignItems:'center' }}>
            {/* Logins CSV — primary (login → id_contrato) */}
            <div>
              <Btn onClick={() => loginsFileRef.current?.click()} variant="primary" style={{ fontSize:12, padding:'6px 12px' }}>
                <Upload size={12} /> 1. Relatório de Logins
              </Btn>
              <input ref={loginsFileRef} type="file" accept=".csv,.txt" style={{ display:'none' }} onChange={handleLoginsUpload} />
            </div>
            {/* Contratos CSV — secondary (id_contrato → telefone) */}
            <div>
              <Btn onClick={() => relFileRef.current?.click()} style={{ fontSize:12, padding:'6px 12px' }}>
                <Upload size={12} /> 2. Relatório de Contratos
              </Btn>
              <input ref={relFileRef} type="file" accept=".csv,.txt" style={{ display:'none' }} onChange={handleRelatorioUpload} />
            </div>
            {relMsg && (
              <span style={{ fontSize:12, color: relMsg.ok ? 'var(--green-text)' : 'var(--red-text)', padding:'4px 10px', background: relMsg.ok ? 'var(--green-subtle)' : 'var(--red-subtle)', borderRadius:6 }}>
                {relMsg.msg}
              </span>
            )}
          </div>
          <div style={{ marginTop:8, fontSize:11, color:'var(--text-tertiary)', lineHeight:1.5 }}>
            <strong style={{ color:'var(--text-secondary)' }}>Ordem:</strong> importe primeiro o <em>Relatório de Logins</em> (lista de acessos com login + ID contrato), depois o <em>Relatório de Contratos</em> (com telefone celular). O sistema cruza pelo ID do contrato — resolve múltiplos logins do mesmo cliente.
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ padding:'14px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <Filter size={14} style={{ color:'var(--accent-blue-text)' }} />
            <span style={{ fontWeight:500, fontSize:13 }}>Filtrar Clientes</span>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px,1fr))', gap:10 }}>
            <div>
              <label style={lbl}>OLT</label>
              <Select value={filters.olt} onChange={e => setFilters(f=>({...f, olt:e.target.value, slot:'', pon:''}))} style={{ width:'100%' }}>
                <option value="">Todas OLTs</option>
                {(stats?.olts||[]).map(o => <option key={o}>{o}</option>)}
              </Select>
            </div>
            <div>
              <label style={lbl}>GBOC</label>
              <Select value={filters.slot} onChange={e => setFilters(f=>({...f, slot:e.target.value, pon:''}))} style={{ width:'100%' }} disabled={!filters.olt}>
                <option value="">Todos</option>
                {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18].map(s => <option key={s} value={s}>GBOC {s}</option>)}
              </Select>
            </div>
            <div>
              <label style={lbl}>PON</label>
              <Select value={filters.pon} onChange={e => setFilters(f=>({...f, pon:e.target.value}))} style={{ width:'100%' }} disabled={!filters.slot}>
                <option value="">Todas</option>
                {Array.from({length:16},(_,i)=>i+1).map(p => <option key={p} value={p}>PON {p}</option>)}
              </Select>
            </div>
            <div>
              <label style={lbl}>Bairro</label>
              <Select value={filters.bairro} onChange={e => setFilters(f=>({...f, bairro:e.target.value}))} style={{ width:'100%' }}>
                <option value="">Todos</option>
                {(bairros||[]).map(b => <option key={b}>{b}</option>)}
              </Select>
            </div>
            <div>
              <label style={lbl}>Status ONU</label>
              <Select value={filters.status} onChange={e => setFilters(f=>({...f, status:e.target.value}))} style={{ width:'100%' }}>
                <option value="">Todos</option>
                <option>Autorizada</option>
                <option>Pedindo autenticacao</option>
              </Select>
            </div>
            <div>
              <label style={lbl}>Busca</label>
              <div style={{ position:'relative' }}>
                <Search size={13} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--text-tertiary)', pointerEvents:'none' }} />
                <Input
                  placeholder="Nome, login, MAC..."
                  style={{ paddingLeft:28, width:'100%' }}
                  value={filters.search}
                  onChange={e => { setFilters(f=>({...f, search:e.target.value})); debSearch(e.target.value) }}
                />
              </div>
            </div>
          </div>

          <div style={{ display:'flex', gap:8, marginTop:12, alignItems:'center', flexWrap:'wrap' }}>
            <Btn variant="primary" onClick={fetchData} disabled={!activeFilters}>
              <Search size={14} /> Buscar
            </Btn>
            <Btn onClick={() => { setFilters({olt:'',slot:'',pon:'',bairro:'',status:'',search:''}); setDSearch(''); setResult(null) }}>
              <X size={14} /> Limpar
            </Btn>
            {filters.olt && filters.slot && filters.pon && (
              <Badge color="blue">{filters.olt} — GBOC {filters.slot} — PON {filters.pon}</Badge>
            )}
            {filters.bairro && <Badge color="green">{filters.bairro}</Badge>}
          </div>
        </div>
      </Card>

      {/* Edit modal */}
      {editModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}>
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:24, width:380 }}>
            <div style={{ fontWeight:600, fontSize:15, marginBottom:4 }}>Editar contato manual</div>
            <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:14, fontFamily:'var(--font-mono)' }}>{editModal.login}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div><label style={lbl}>WhatsApp</label>
                <Input value={editModal.whatsapp} onChange={e=>setEditModal(m=>({...m,whatsapp:e.target.value}))} style={{ width:'100%' }} placeholder="16991234567" />
              </div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:18 }}>
              <Btn onClick={() => setEditModal(null)}>Cancelar</Btn>
              <Btn variant="primary" onClick={async () => {
                const { apiClientes } = await import('../utils/api')
                await apiClientes.manual(editModal.login, editModal.nome, editModal.whatsapp)
                setEditModal(null); fetchData()
              }}>Salvar</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!activeFilters && !result && (
        <Card>
          <div style={{ padding:48, textAlign:'center' }}>
            <Send size={32} style={{ color:'var(--text-tertiary)', margin:'0 auto 12px', display:'block' }} />
            <div style={{ fontSize:14, fontWeight:500, color:'var(--text-secondary)', marginBottom:6 }}>Selecione os filtros acima</div>
            <div style={{ fontSize:13, color:'var(--text-tertiary)' }}>
              Filtre por <strong>OLT + GBOC + PON</strong> ou por <strong>Bairro</strong> para listar os clientes
            </div>
          </div>
        </Card>
      )}

      {loading && <Spinner />}
      {error && <ErrorMsg message={error} />}

      {result && !loading && (
        <Card>
          <CardHeader
            title={`${result.total.toLocaleString('pt-BR')} cliente${result.total!==1?'s':''}`}
            subtitle={
              <span style={{ display:'flex', gap:8, alignItems:'center' }}>
                {comContato > 0  && <Badge color="green" size="sm"><Phone size={10} style={{ display:'inline', marginRight:3 }} />{comContato} com WhatsApp</Badge>}
                {semContato > 0  && <Badge color="amber" size="sm"><AlertTriangle size={10} style={{ display:'inline', marginRight:3 }} />{semContato} sem contato</Badge>}
                {selected.size > 0 && <Badge color="blue" size="sm">{selected.size} selecionado{selected.size!==1?'s':''}</Badge>}
              </span>
            }
            action={
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-secondary)', cursor:'pointer', userSelect:'none' }}>
                  <input type="checkbox" checked={somenteComContato} onChange={e=>{ setSomenteComContato(e.target.checked); setSelected(new Set()) }} />
                  Só com WhatsApp
                </label>
                <Btn onClick={toggleAll} style={{ fontSize:12 }}>
                  {selected.size===r.length && r.length>0 ? <CheckSquare size={14}/> : <Square size={14}/>}
                  {selected.size===r.length && r.length>0 ? 'Desmarcar' : 'Selecionar tudo'}
                </Btn>
              </div>
            }
          />

          {r.length === 0 ? <Empty /> : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr>
                    <th style={th}></th>
                    <th style={th}>Nome</th>
                    <th style={th}>WhatsApp</th>
                    <th style={th}>Login</th>
                    <th style={th}>Bairro</th>
                    <th style={th}>OLT / GBOC / PON</th>
                    <th style={th}>Status</th>
                    <th style={th}>CTO</th>
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {r.map((row, i) => {
                    const sel = selected.has(i)
                    return (
                      <tr key={i} onClick={()=>toggleRow(i)}
                        style={{ cursor:'pointer', background: sel ? 'var(--accent-blue-subtle)' : 'transparent' }}
                        onMouseEnter={e=>{ if(!sel) e.currentTarget.style.background='var(--bg-hover)' }}
                        onMouseLeave={e=>{ if(!sel) e.currentTarget.style.background='transparent' }}>
                        <td style={td}>
                          <span style={{ color: sel ? 'var(--accent-blue-text)' : 'var(--text-tertiary)' }}>
                            {sel ? <CheckSquare size={14}/> : <Square size={14}/>}
                          </span>
                        </td>
                        <td style={td}><span style={{ fontWeight:500, fontSize:13 }}>{row.nome_formatado || '—'}</span></td>
                        <td style={td}>
                          {row.whatsapp
                            ? <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--green-text)', fontWeight:500 }}>{fmtPhone(row.whatsapp)}</span>
                            : <span style={{ fontSize:11, color:'var(--text-tertiary)', fontStyle:'italic' }}>sem contato</span>}
                        </td>
                        <td style={{ ...td, fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-secondary)' }}>{row.login}</td>
                        <td style={td}>
                          {row.bairro
                            ? <Badge color="green" size="sm">{row.bairro}</Badge>
                            : <span style={{ color:'var(--text-tertiary)', fontSize:11 }}>—</span>}
                        </td>
                        <td style={{ ...td, fontFamily:'var(--font-mono)', fontSize:12 }}>
                          {row.olt} / G{row.slot} / P{row.pon}
                        </td>
                        <td style={td}><StatusBadge status={row.status}/></td>
                        <td style={{ ...td, fontSize:12, color:'var(--text-secondary)' }}>{row.cto||'—'}</td>
                        <td style={td}>
                          <button
                            onClick={e=>{ e.stopPropagation(); setEditModal({ login:row.login, nome:row.nome_formatado, whatsapp:row.whatsapp||'' }) }}
                            style={{ background:'none', border:'1px solid var(--border)', cursor:'pointer', color:'var(--text-secondary)', padding:'3px 8px', borderRadius:4, fontSize:11 }}
                          >✎</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)', background:'var(--bg-secondary)', borderRadius:'0 0 10px 10px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Info size={13} style={{ color:'var(--accent-blue-text)', flexShrink:0 }} />
              <span style={{ fontSize:12, color:'var(--text-secondary)' }}>
                O CSV exportado usa o formato <code style={{ fontFamily:'var(--font-mono)', color:'var(--accent-blue-text)' }}>name, whatsapp</code> — igual ao padrão do disparador.
                Número no formato <code style={{ fontFamily:'var(--font-mono)' }}>5516991234567</code>.
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

const th  = { padding:'9px 12px', textAlign:'left', fontSize:11, color:'var(--text-secondary)', background:'var(--bg-secondary)', borderBottom:'1px solid var(--border)', fontWeight:500, textTransform:'uppercase', letterSpacing:'.05em', whiteSpace:'nowrap' }
const td  = { padding:'9px 12px', borderBottom:'1px solid var(--border-subtle)', color:'var(--text-primary)', whiteSpace:'nowrap' }
const lbl = { display:'block', fontSize:11, color:'var(--text-secondary)', marginBottom:4, fontWeight:500, textTransform:'uppercase', letterSpacing:'.05em' }
