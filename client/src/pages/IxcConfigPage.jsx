import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { api, apiIxc } from '../utils/api'
import { Card, CardHeader, Input, Select, Btn, Badge, PageHeader, Spinner, ErrorMsg } from '../components/UI'
import { Settings, Wifi, RefreshCw, Search, CheckCircle, XCircle, AlertTriangle, Radio, Download } from 'lucide-react'

export default function IxcConfigPage() {
  const { data: cfg, loading: loadingCfg, refetch: refetchCfg } = useApi(() => apiIxc.getConfig())
  const { data: stats } = useApi(() => api.stats())

  const [host,  setHost]  = useState('')
  const [token, setToken] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  // Sync all
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)

  // Sync by PON
  const [ponOlt,  setPonOlt]  = useState('')
  const [ponSlot, setPonSlot] = useState('')
  const [ponPon,  setPonPon]  = useState('')
  const [syncingPon, setSyncingPon] = useState(false)
  const [syncPonResult, setSyncPonResult] = useState(null)

  // Single lookup
  const [lookupLogin, setLookupLogin] = useState('')
  const [lookupResult, setLookupResult] = useState(null)
  const [lookupLoading, setLookupLoading] = useState(false)

  async function handleSave() {
    if (!host || !token) return
    setSaving(true)
    try {
      await apiIxc.saveConfig(host.trim(), token.trim())
      refetchCfg()
      setToken('')
    } catch (e) { alert('Erro ao salvar: ' + e.message) }
    finally { setSaving(false) }
  }

  async function handleTest() {
    setTesting(true); setTestResult(null)
    try {
      const r = await apiIxc.test()
      setTestResult({ ok: true, msg: `✓ Conexão OK — ${r.total} clientes encontrados`, fields: r.sample })
    } catch (e) {
      setTestResult({ ok: false, msg: '✕ Falha: ' + e.message })
    }
    finally { setTesting(false) }
  }

  async function handleSyncAll() {
    if (!confirm('Isso vai consultar TODOS os logins na API IXC. Pode demorar alguns minutos. Continuar?')) return
    setSyncing(true); setSyncResult(null)
    try {
      const r = await apiIxc.syncAll()
      setSyncResult(r)
    } catch (e) {
      setSyncResult({ ok: false, error: e.message })
    }
    finally { setSyncing(false) }
  }

  async function handleSyncPon() {
    if (!ponOlt || !ponSlot || !ponPon) return
    setSyncingPon(true); setSyncPonResult(null)
    try {
      const r = await apiIxc.syncPon(ponOlt, ponSlot, ponPon)
      setSyncPonResult(r)
    } catch (e) {
      setSyncPonResult({ ok: false, error: e.message })
    }
    finally { setSyncingPon(false) }
  }

  async function handleLookup() {
    if (!lookupLogin.trim()) return
    setLookupLoading(true); setLookupResult(null)
    try {
      const r = await apiIxc.lookup(lookupLogin.trim())
      setLookupResult(r)
    } catch (e) {
      setLookupResult({ error: e.message })
    }
    finally { setLookupLoading(false) }
  }

  function fmtPhone(d) {
    if (!d) return '—'
    const n = d.replace(/\D/g,'').replace(/^55/,'')
    if (n.length === 11) return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`
    return d
  }

  const isConfigured = cfg?.host && cfg?.token

  return (
    <div>
      <PageHeader
        title="Integração IXCSoft"
        subtitle="Configure o acesso à API do IXC Provedor para buscar telefones de contato automaticamente"
      />

      {/* Config card */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader
          title="Configuração da API"
          action={isConfigured
            ? <Badge color="green">● Configurado — {cfg.host}</Badge>
            : <Badge color="amber">⚠ Não configurado</Badge>}
        />
        <div style={{ padding: '16px 18px' }}>
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Como obter o token:</strong> No IXC Provedor acesse{' '}
            <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-blue-text)' }}>Configurações → Usuários → Usuários</code>{' '}
            → edite o usuário → aba <strong>Parâmetros</strong> → copie o <strong>Token API</strong> no formato{' '}
            <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber-text)' }}>usuario:token_gerado</code>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lbl}>URL do IXC (sem /webservice)</label>
              <Input
                placeholder={cfg?.host || 'https://ixc.suaempresa.com.br'}
                value={host}
                onChange={e => setHost(e.target.value)}
                style={{ width: '100%' }}
              />
              {cfg?.host && !host && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>Atual: {cfg.host}</div>}
            </div>
            <div>
              <label style={lbl}>Token API (usuario:token)</label>
              <Input
                type="password"
                placeholder={cfg?.token || 'admin:abc123xyz...'}
                value={token}
                onChange={e => setToken(e.target.value)}
                style={{ width: '100%' }}
              />
              {cfg?.token && !token && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>Token já salvo (oculto)</div>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn variant="primary" onClick={handleSave} disabled={saving || (!host && !token)}>
              {saving ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Settings size={14} />}
              {saving ? 'Salvando...' : 'Salvar configuração'}
            </Btn>
            <Btn onClick={handleTest} disabled={testing || !isConfigured}>
              {testing ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Wifi size={14} />}
              {testing ? 'Testando...' : 'Testar conexão'}
            </Btn>
          </div>

          {testResult && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: testResult.ok ? 'var(--green-subtle)' : 'var(--red-subtle)', border: `1px solid ${testResult.ok ? '#2d4a2d' : '#4a1f1f'}` }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: testResult.ok ? 'var(--green-text)' : 'var(--red-text)' }}>
                {testResult.ok ? <CheckCircle size={14} style={{ display: 'inline', marginRight: 6 }} /> : <XCircle size={14} style={{ display: 'inline', marginRight: 6 }} />}
                {testResult.msg}
              </div>
              {testResult.fields && (
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>
                  Campos disponíveis: <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-blue-text)' }}>{testResult.fields.join(', ')}</code>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Sync by PON */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader
          title="Sincronizar por PON"
          subtitle="Busca os telefones só dos clientes de uma PON específica — mais rápido"
        />
        <div style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label style={lbl}>OLT</label>
              <Select value={ponOlt} onChange={e => setPonOlt(e.target.value)} style={{ width: 110 }}>
                <option value="">OLT</option>
                {(stats?.olts || []).map(o => <option key={o}>{o}</option>)}
              </Select>
            </div>
            <div>
              <label style={lbl}>GBOC</label>
              <Select value={ponSlot} onChange={e => setPonSlot(e.target.value)} style={{ width: 100 }} disabled={!ponOlt}>
                <option value="">GBOC</option>
                {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18].map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div>
              <label style={lbl}>PON</label>
              <Select value={ponPon} onChange={e => setPonPon(e.target.value)} style={{ width: 100 }} disabled={!ponSlot}>
                <option value="">PON</option>
                {Array.from({ length: 16 }, (_, i) => i + 1).map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
            </div>
            <Btn
              variant="primary"
              onClick={handleSyncPon}
              disabled={syncingPon || !ponOlt || !ponSlot || !ponPon || !isConfigured}
              style={{ marginBottom: 1 }}
            >
              {syncingPon
                ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Buscando...</>
                : <><Radio size={14} /> Sincronizar PON</>}
            </Btn>
          </div>

          {syncPonResult && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: syncPonResult.ok ? 'var(--green-subtle)' : 'var(--red-subtle)', border: `1px solid ${syncPonResult.ok ? '#2d4a2d' : '#4a1f1f'}` }}>
              {syncPonResult.ok ? (
                <div>
                  <div style={{ fontWeight: 500, color: 'var(--green-text)', marginBottom: 4 }}>
                    ✓ {syncPonResult.ponLabel} sincronizada
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 12 }}>
                    <span>Logins na PON: <strong style={{ color: 'var(--text-primary)' }}>{syncPonResult.loginsFound}</strong></span>
                    <span>Encontrados no IXC: <strong style={{ color: 'var(--text-primary)' }}>{syncPonResult.matched}</strong></span>
                    <span>Com telefone: <strong style={{ color: 'var(--green-text)' }}>{syncPonResult.withPhone}</strong></span>
                  </div>
                  {syncPonResult.errors?.length > 0 && (
                    <div style={{ marginTop: 6, fontSize: 11, color: 'var(--amber-text)' }}>
                      <AlertTriangle size={11} style={{ display: 'inline', marginRight: 4 }} />
                      {syncPonResult.errors.join(' | ')}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: 'var(--red-text)', fontSize: 13 }}>✕ {syncPonResult.error}</div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Sync all */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader
          title="Sincronização Completa"
          subtitle="Busca telefones de todos os 6.311 logins — pode demorar alguns minutos"
        />
        <div style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Btn
              onClick={handleSyncAll}
              disabled={syncing || !isConfigured}
            >
              {syncing
                ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Sincronizando...</>
                : <><Download size={14} /> Sincronizar todos os logins</>}
            </Btn>
            {!isConfigured && <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Configure a API primeiro</span>}
          </div>

          {syncResult && (
            <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 8, background: syncResult.ok ? 'var(--accent-blue-subtle)' : 'var(--red-subtle)', border: `1px solid ${syncResult.ok ? '#1f3a5f' : '#4a1f1f'}` }}>
              {syncResult.ok ? (
                <div>
                  <div style={{ fontWeight: 500, color: 'var(--accent-blue-text)', marginBottom: 8 }}>✓ Sincronização concluída</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10 }}>
                    {[
                      { label: 'Logins processados', value: syncResult.loginsProcessed, color: 'var(--text-primary)' },
                      { label: 'Encontrados no IXC',  value: syncResult.matched,         color: 'var(--accent-blue-text)' },
                      { label: 'Com telefone salvo',  value: syncResult.withPhone,        color: 'var(--green-text)' },
                    ].map(s => (
                      <div key={s.label} style={{ background: 'var(--bg-tertiary)', borderRadius: 6, padding: '8px 12px' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{s.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 600, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                  {syncResult.errors?.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 11, color: 'var(--amber-text)' }}>
                      <AlertTriangle size={11} style={{ display: 'inline', marginRight: 4 }} />
                      Avisos: {syncResult.errors.slice(0, 3).join(' | ')}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: 'var(--red-text)', fontSize: 13 }}>✕ {syncResult.error}</div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Single lookup */}
      <Card>
        <CardHeader title="Consulta Individual" subtitle="Teste um login específico" />
        <div style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Login</label>
              <Input
                placeholder="ex: adrielderodrigues"
                value={lookupLogin}
                onChange={e => setLookupLogin(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLookup()}
                style={{ width: '100%' }}
              />
            </div>
            <Btn variant="primary" onClick={handleLookup} disabled={lookupLoading || !lookupLogin.trim() || !isConfigured}>
              {lookupLoading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={14} />}
              Consultar
            </Btn>
          </div>

          {lookupResult && (
            <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-tertiary)' }}>
              {lookupResult.error ? (
                <div style={{ color: 'var(--red-text)', fontSize: 13 }}>✕ {lookupResult.error}</div>
              ) : lookupResult.data ? (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--green-text)', marginBottom: 10 }}>
                    ✓ Cliente encontrado e salvo
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, fontSize: 13 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>NOME</div>
                      <div style={{ fontWeight: 500 }}>{lookupResult.data.name || '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>WHATSAPP</div>
                      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--green-text)', fontWeight: 600 }}>
                        {fmtPhone(lookupResult.data.whatsapp) || '—'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>ID CLIENTE IXC</div>
                      <div style={{ fontFamily: 'var(--font-mono)' }}>{lookupResult.data.id_cliente || '—'}</div>
                    </div>
                  </div>
                  {lookupResult.errors?.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 11, color: 'var(--amber-text)' }}>
                      Avisos: {lookupResult.errors.join(' | ')}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: 'var(--amber-text)', fontSize: 13 }}>
                  <AlertTriangle size={13} style={{ display: 'inline', marginRight: 6 }} />
                  Login não encontrado na API IXC. Verifique se existe em fn_onu ou fn_rad_acesso.
                  {lookupResult.errors?.length > 0 && <div style={{ marginTop: 4, fontSize: 11 }}>{lookupResult.errors.join(' | ')}</div>}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )

  function fmtPhone(d) {
    if (!d) return ''
    const n = d.replace(/\D/g,'').replace(/^55/,'')
    if (n.length === 11) return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`
    return d
  }
}

const lbl = { display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em' }
