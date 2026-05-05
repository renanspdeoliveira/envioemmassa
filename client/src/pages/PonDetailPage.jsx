import { useParams, useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { api } from '../utils/api'
import { Card, CardHeader, Spinner, ErrorMsg, StatusBadge, RxBadge, PotenciaBadge, Badge, Btn } from '../components/UI'
import { ArrowLeft } from 'lucide-react'

export default function PonDetailPage() {
  const { ponId } = useParams()
  const navigate = useNavigate()
  const { data, loading, error } = useApi(() => api.ponDetail(ponId), [ponId])

  if (loading) return <Spinner />
  if (error) return <ErrorMsg message={error} />
  if (!data) return null

  const { pon, onus } = data

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Btn onClick={() => navigate(-1)}><ArrowLeft size={14} /> Voltar para PONs</Btn>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>PON {pon['PON ID']}</h1>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <Badge color="blue">{pon.OLT}</Badge>
          <Badge color="gray">Slot {pon.Slot}</Badge>
          <Badge color="gray">PON {pon.PON}</Badge>
          <Badge color="green">{pon.Autorizadas} autorizadas</Badge>
          {pon.Desautorizadas > 0 && <Badge color="red">{pon.Desautorizadas} desautorizadas</Badge>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total ONUs', value: pon['Total ONUs'] },
          { label: 'Autorizadas', value: pon.Autorizadas, color: 'var(--green-text)' },
          { label: 'Desautorizadas', value: pon.Desautorizadas, color: pon.Desautorizadas > 0 ? 'var(--red-text)' : undefined },
          { label: 'RX médio', value: pon['Sinal RX médio'] ? `${pon['Sinal RX médio']?.toFixed(2)} dBm` : '—' },
          { label: 'Pior RX', value: pon['Pior RX'] ? `${pon['Pior RX']?.toFixed(2)} dBm` : '—', color: pon['Pior RX'] < -27 ? 'var(--red-text)' : 'var(--amber-text)' },
          { label: 'Sem leitura', value: pon['Sem leitura RX/zero'] },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 500 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: s.color || 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader title={`ONUs nesta PON (${onus.length})`} />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['#', 'Cliente', 'Login', 'MAC/Serial', 'Status', 'Sinal RX', 'Potência', 'Tipo ONU'].map(h => (
                  <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {onus.map((o, i) => (
                <tr key={i}
                  onClick={() => o['MAC/Serial'] && navigate(`/onus/${encodeURIComponent(o['MAC/Serial'])}`)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...td, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{i + 1}</td>
                  <td style={td}>{o['Nome Cliente'] || '—'}</td>
                  <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{o.Login || '—'}</td>
                  <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>{o['MAC/Serial'] || '—'}</td>
                  <td style={td}><StatusBadge status={o['Status ONU']} /></td>
                  <td style={td}><RxBadge value={o['Sinal RX']} /></td>
                  <td style={td}><PotenciaBadge value={o['Potência']} /></td>
                  <td style={{ ...td, color: 'var(--text-secondary)', fontSize: 12 }}>{o['ONU Tipo'] || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

const td = { padding: '9px 12px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)', whiteSpace: 'nowrap' }
