import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { api } from '../utils/api'
import { Card, CardHeader, Spinner, ErrorMsg, Badge, Select, PageHeader, Btn } from '../components/UI'

export default function PonsPage() {
  const navigate = useNavigate()
  const [olt, setOlt] = useState('')
  const [slot, setSlot] = useState('')

  const { data, loading, error } = useApi(
    () => api.pons({ ...(olt && { olt }), ...(slot && { slot }), limit: 300 }),
    [olt, slot]
  )

  const { data: stats } = useApi(() => api.stats())

  const slots = [...new Set((data?.data || []).map(p => p.Slot))].sort((a, b) => a - b)

  function rxColor(rx) {
    if (!rx) return 'var(--text-tertiary)'
    if (rx > -20) return 'var(--green-text)'
    if (rx >= -24) return 'var(--accent-blue-text)'
    if (rx >= -27) return 'var(--amber-text)'
    return 'var(--red-text)'
  }

  function ponHealth(row) {
    if (row.Desautorizadas > 0 || row['Sem status'] > 0) return 'amber'
    if (row['Pior RX'] !== null && row['Pior RX'] < -27) return 'red'
    if (row['Sem leitura RX/zero'] > 3) return 'amber'
    return 'green'
  }

  const grouped = {}
  ;(data?.data || []).forEach(row => {
    const key = `${row.OLT}-Slot ${row.Slot}`
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(row)
  })

  return (
    <div>
      <PageHeader
        title="PONs por OLT"
        subtitle="Visao detalhada de cada porta PON e seus indicadores de qualidade"
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Select value={olt} onChange={e => { setOlt(e.target.value); setSlot('') }}>
              <option value="">Todas OLTs</option>
              {(stats?.olts || []).map(o => <option key={o}>{o}</option>)}
            </Select>
            <Select value={slot} onChange={e => setSlot(e.target.value)} disabled={!olt}>
              <option value="">Todos Slots</option>
              {slots.map(s => <option key={s} value={s}>Slot {s}</option>)}
            </Select>
          </div>
        }
      />

      {loading ? <Spinner /> : error ? <ErrorMsg message={error} /> : (
        Object.entries(grouped).map(([group, pons]) => (
          <Card key={group} style={{ marginBottom: 16 }}>
            <CardHeader
              title={group}
              subtitle={`${pons.length} PONs • ${pons.reduce((a, p) => a + (p['Total ONUs'] || 0), 0)} ONUs`}
              action={<Badge color="blue">{pons[0]?.OLT}</Badge>}
            />
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['PON ID', 'Total ONUs', 'Autorizadas', 'Pedindo aut.', 'Sem status', 'RX medio', 'Pior RX', 'Sem leitura', 'Saude', ''].map(h => (
                      <th
                        key={h}
                        style={{
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
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pons.map((p, i) => {
                    const health = ponHealth(p)
                    const healthLabels = {
                      green: ['green', 'OK'],
                      amber: ['amber', 'Atencao'],
                      red: ['red', 'Critico'],
                    }
                    const [hColor, hLabel] = healthLabels[health]

                    return (
                      <tr
                        key={i}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={td}><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-blue-text)' }}>{p['PON ID'] || '-'}</span></td>
                        <td style={td}><strong>{p['Total ONUs']}</strong></td>
                        <td style={td}><span style={{ color: 'var(--green-text)' }}>{p.Autorizadas}</span></td>
                        <td style={td}>
                          {p.Desautorizadas > 0
                            ? <span style={{ color: 'var(--red-text)', fontWeight: 600 }}>{p.Desautorizadas}</span>
                            : <span style={{ color: 'var(--text-tertiary)' }}>0</span>}
                        </td>
                        <td style={td}>
                          {p['Sem status'] > 0
                            ? <span style={{ color: 'var(--amber-text)' }}>{p['Sem status']}</span>
                            : <span style={{ color: 'var(--text-tertiary)' }}>0</span>}
                        </td>
                        <td style={td}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: rxColor(p['Sinal RX mÃ©dio']) }}>
                            {p['Sinal RX mÃ©dio'] !== null ? `${p['Sinal RX mÃ©dio']?.toFixed(2)} dBm` : '-'}
                          </span>
                        </td>
                        <td style={td}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: rxColor(p['Pior RX']) }}>
                            {p['Pior RX'] !== null ? `${p['Pior RX']?.toFixed(2)} dBm` : '-'}
                          </span>
                        </td>
                        <td style={td}>
                          {p['Sem leitura RX/zero'] > 0
                            ? <span style={{ color: 'var(--amber-text)' }}>{p['Sem leitura RX/zero']}</span>
                            : <span style={{ color: 'var(--text-tertiary)' }}>0</span>}
                        </td>
                        <td style={td}><Badge color={hColor} size="sm">{hLabel}</Badge></td>
                        <td style={td}>
                          {p['PON ID'] && (
                            <Btn style={{ padding: '3px 10px', fontSize: 11 }} onClick={() => navigate(`/pons/${encodeURIComponent(p['PON ID'])}`)}>
                              Ver ONUs
                            </Btn>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}

const td = { padding: '9px 12px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)', whiteSpace: 'nowrap' }
