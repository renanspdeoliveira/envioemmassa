import { useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { api } from '../utils/api'
import { Badge, Card, CardHeader, Empty, ErrorMsg, PageHeader, PotenciaBadge, RxBadge, Spinner, StatusBadge } from '../components/UI'
import { Wifi } from 'lucide-react'

export default function OnuDesautorizadasPage() {
  const navigate = useNavigate()
  const { data, loading, error } = useApi(() => api.alertas())

  if (loading) return <Spinner />
  if (error) return <ErrorMsg message={error} />

  const rows = (data?.desautorizadas || []).filter(row => row?.['MAC/Serial'] || row?.['Nome Cliente'] || row?.Login)

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

  function hasRealMac(row) {
    const mac = String(row?.['MAC/Serial'] || '').trim()
    return !!mac && mac !== '-'
  }

  return (
    <div>
      <PageHeader
        title="ONU Desautorizadas"
        subtitle={`${rows.length.toLocaleString('pt-BR')} ONUs pedindo autenticacao`}
        action={
          <Badge color="red">
            <Wifi size={12} style={{ display: 'inline', marginRight: 4 }} />
            Pedindo autenticacao
          </Badge>
        }
      />

      <Card>
        <CardHeader title="Lista de ONUs" subtitle="Clique em uma ONU para abrir os detalhes" />
        {!rows.length ? (
          <Empty message="Nenhuma ONU pedindo autenticacao no momento" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['OLT', 'PON', 'Cliente', 'MAC/Serial', 'Status', 'Sinal RX', 'Potencia'].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    onClick={() => hasRealMac(row) && navigate(`/onus/${encodeURIComponent(row['MAC/Serial'])}`)}
                    style={{ cursor: hasRealMac(row) ? 'pointer' : 'default' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={td}><Badge color="blue" size="sm">{row.OLT}</Badge></td>
                    <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{row['PON ID'] || '-'}</td>
                    <td style={td}>{row['Nome Cliente'] || '-'}</td>
                    <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>{row['MAC/Serial'] || '-'}</td>
                    <td style={td}><StatusBadge status={row['Status ONU']} /></td>
                    <td style={td}><RxBadge value={row['Sinal RX']} /></td>
                    <td style={td}><PotenciaBadge value={row['PotÃªncia']} /></td>
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
