import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { api, apiClientes } from '../utils/api'
import { Card, CardHeader, Spinner, ErrorMsg, StatusBadge, PotenciaBadge, RxBadge, Badge, Btn } from '../components/UI'
import { ArrowLeft, Router, Signal, Wifi } from 'lucide-react'

function InfoRow({ label, value, mono = false }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: mono ? 'var(--font-mono)' : 'inherit', textAlign: 'right' }}>{value || '-'}</span>
    </div>
  )
}

function getDisplayClientName(onu) {
  const name = onu?.nome_formatado || onu?.['Nome Cliente']
  const mac = onu?.['MAC/Serial']
  if (!name) return 'ONU sem cliente vinculado'
  if (mac && String(name).trim().toUpperCase() === String(mac).trim().toUpperCase()) return 'ONU sem cliente vinculado'
  if (/^FHTT[0-9A-F]+$/i.test(String(name).trim()) && !onu?.Login) return 'ONU sem cliente vinculado'
  return name
}

function getDisplayOlt(onu) {
  const olt = onu?.OLT
  if (!olt || String(olt).trim().toUpperCase() === 'OLT') return null
  return olt
}

function fmtPhone(d) {
  if (!d) return '-'
  const n = String(d).replace(/\D/g, '').replace(/^55/, '')
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`
  return d
}

export default function OnuDetailPage() {
  const { mac } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const offlineContext = location.state?.offlineContext || null
  const { data, loading, error } = useApi(() => api.onuDetail(mac), [mac], { refreshInterval: 30000 })
  const [savingPowerOff, setSavingPowerOff] = useState(false)
  const persistedIgnoreOfflineAlways = !!data?.onu?.ignoreOfflineAlways
  const [ignoreOfflineAlways, setIgnoreOfflineAlways] = useState(!!offlineContext?.ignoreOfflineAlways)

  useEffect(() => {
    setIgnoreOfflineAlways(!!offlineContext?.ignoreOfflineAlways || persistedIgnoreOfflineAlways)
  }, [offlineContext?.ignoreOfflineAlways, persistedIgnoreOfflineAlways, mac])

  if (loading) return <Spinner />
  if (error) return <ErrorMsg message={error} />
  if (!data) return null

  const { onu, siblings, ponSummary } = data
  const displayName = getDisplayClientName(onu)
  const displayOlt = getDisplayOlt(onu)
  const displayPonId = onu['PON ID'] || null

  async function handleToggleIgnoreOffline() {
    if (!onu?.Login) return
    try {
      setSavingPowerOff(true)
      const nextValue = !ignoreOfflineAlways
      await apiClientes.offlineIgnore(onu.Login, nextValue)
      setIgnoreOfflineAlways(nextValue)
    } finally {
      setSavingPowerOff(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Btn onClick={() => navigate(-1)}><ArrowLeft size={14} /> Voltar</Btn>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--accent-blue-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Wifi size={22} color="var(--accent-blue-text)" />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>{displayName}</h1>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <StatusBadge status={onu['Status ONU']} />
            <PotenciaBadge value={onu['PotÃªncia'] || onu['PotÃƒÂªncia']} />
            {displayOlt && <Badge color="blue">{displayOlt}</Badge>}
            {displayPonId && <Badge color="gray">PON {displayPonId}</Badge>}
            {onu.online && <Badge color="green">Online</Badge>}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card>
          <CardHeader title="Dados do Cliente" icon={Router} />
          <div style={{ padding: '4px 18px 16px' }}>
            <InfoRow label="Nome" value={displayName} />
            <InfoRow label="Login" value={onu.Login} mono />
            <InfoRow label="ID Login" value={onu['ID Login']} mono />
            <InfoRow label="WhatsApp" value={fmtPhone(onu.whatsapp)} mono />
            <InfoRow label="MAC / Serial" value={onu['MAC/Serial']} mono />
            <InfoRow label="ONU N" value={onu['ONU NÂº'] || onu['ONU NÃ‚Âº']} mono />
            <InfoRow label="Tipo ONU" value={onu['ONU Tipo']} />
            <InfoRow label="VLAN" value={onu.VLAN ? Math.round(onu.VLAN) : '-'} mono />
            <InfoRow label="Ultima atualizacao" value={onu['Ãšltima atualizaÃ§Ã£o'] || onu['ÃƒÅ¡ltima atualizaÃƒÂ§ÃƒÂ£o']} />
            {offlineContext && <InfoRow label="Tempo offline" value={offlineContext.tempoOffline || '-'} mono />}
            {offlineContext && <InfoRow label="Ultima conexao" value={offlineContext.ultimaConexao || '-'} mono />}
            {offlineContext && <InfoRow label="Ultimo IP" value={offlineContext.ultimoIp || '-'} mono />}
            <div style={offlineFlagBox}>
              <label style={offlineFlagLabel}>
                <input
                  type="checkbox"
                  checked={ignoreOfflineAlways}
                  disabled={savingPowerOff || !onu?.Login}
                  onChange={handleToggleIgnoreOffline}
                />
                <span>Sempre desliga da energia</span>
              </label>
              <div style={offlineFlagHint}>
                {onu?.Login
                  ? 'Quando marcado, esse cliente passa para a guia Sempre desligam.'
                  : 'Associe um login a esta ONU para conseguir salvar essa preferencia.'}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Rede / Sinal" icon={Signal} />
          <div style={{ padding: '4px 18px 16px' }}>
            <InfoRow label="OLT" value={displayOlt ? <Badge color="blue">{displayOlt}</Badge> : null} />
            <InfoRow label="GBOC" value={onu.Slot} mono />
            <InfoRow label="PON" value={onu.PON} mono />
            <InfoRow label="PON ID" value={displayPonId} mono />
            <InfoRow label="PON Grupo" value={onu['PON Grupo']} />
            <InfoRow label="Sinal RX" value={<RxBadge value={onu['Sinal RX']} />} />
            <InfoRow label="Sinal TX" value={<RxBadge value={onu['Sinal TX']} />} />
            <InfoRow label="Potencia" value={<PotenciaBadge value={onu['PotÃªncia'] || onu['PotÃƒÂªncia']} />} />
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card>
          <CardHeader title="Localizacao Fisica" />
          <div style={{ padding: '4px 18px 16px' }}>
            <InfoRow label="POP" value={onu.POP} />
            <InfoRow label="Caixa FTTH / CTO" value={onu['Caixa FTTH/CTO']} mono />
            <InfoRow label="Porta FTTH" value={onu['Porta FTTH']} />
            <InfoRow label="ID ONU Fibra" value={onu['ID ONU Fibra']} mono />
            <InfoRow label="Causa ultima queda" value={onu['Causa Ãºltima queda'] || onu['Causa ÃƒÂºltima queda'] || 'Sem registro'} />
          </div>
        </Card>

        {ponSummary && (
          <Card>
            <CardHeader title={`Resumo da PON ${ponSummary['PON ID']}`} />
            <div style={{ padding: '4px 18px 16px' }}>
              <InfoRow label="Total ONUs" value={ponSummary['Total ONUs']} />
              <InfoRow label="Autorizadas" value={<Badge color="green">{ponSummary.Autorizadas}</Badge>} />
              <InfoRow label="Pedindo autenticacao" value={ponSummary.Desautorizadas > 0 ? <Badge color="red">{ponSummary.Desautorizadas}</Badge> : '0'} />
              <InfoRow label="Sinal RX medio" value={<RxBadge value={ponSummary['Sinal RX mÃ©dio'] || ponSummary['Sinal RX mÃƒÂ©dio']} />} />
              <InfoRow label="Pior RX" value={<RxBadge value={ponSummary['Pior RX']} />} />
              <InfoRow label="Sem leitura RX" value={ponSummary['Sem leitura RX/zero']} />
            </div>
          </Card>
        )}
      </div>

      {siblings?.length > 0 && (
        <Card>
          <CardHeader title={`Outras ONUs na mesma PON (${siblings.length} mostradas)`} subtitle="Nome, MAC e WhatsApp da mesma PON" />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Cliente / MAC', 'Login', 'WhatsApp', 'Status', 'Sinal RX', 'Potencia'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {siblings.map((s, i) => (
                  <tr
                    key={i}
                    onClick={() => navigate(`/onus/${encodeURIComponent(s['MAC/Serial'])}`)}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ ...td, minWidth: 240, whiteSpace: 'normal' }}>
                      <div style={{ fontWeight: 500 }}>{getDisplayClientName(s)}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{s['MAC/Serial'] || '-'}</div>
                    </td>
                    <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{s.Login || '-'}</td>
                    <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 12, color: s.whatsapp ? 'var(--green-text)' : 'var(--text-tertiary)' }}>{fmtPhone(s.whatsapp)}</td>
                    <td style={td}><StatusBadge status={s['Status ONU']} /></td>
                    <td style={td}><RxBadge value={s['Sinal RX']} /></td>
                    <td style={td}><PotenciaBadge value={s['PotÃªncia'] || s['PotÃƒÂªncia']} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

const td = { padding: '9px 12px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }

const offlineFlagBox = {
  marginTop: 14,
  padding: '12px 14px',
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.02)',
}

const offlineFlagLabel = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  fontSize: 13,
  color: 'var(--text-primary)',
  fontWeight: 600,
}

const offlineFlagHint = {
  marginTop: 8,
  fontSize: 12,
  color: 'var(--text-secondary)',
  lineHeight: 1.5,
}
