export function rxClass(rx) {
  if (rx === null || rx === undefined || rx === 0) return 'no-signal'
  if (rx > -20) return 'excellent'
  if (rx >= -24) return 'good'
  if (rx >= -27) return 'fair'
  return 'poor'
}

export function rxLabel(rx) {
  if (rx === null || rx === undefined || rx === 0) return 'Sem leitura'
  if (rx > -20) return 'Excelente'
  if (rx >= -24) return 'Bom'
  if (rx >= -27) return 'Regular'
  return 'Ruim'
}

export function rxColor(rx) {
  const c = rxClass(rx)
  return { excellent: '#56d364', good: '#58a6ff', fair: '#e3b341', poor: '#ff7b72', 'no-signal': '#484f58' }[c]
}

export function statusColor(status) {
  if (status === 'Autorizada') return 'green'
  if (status === 'Desautorizada' || status === 'Pedindo autenticacao') return 'red'
  return 'amber'
}

export function fmt(val, fallback = '—') {
  if (val === null || val === undefined || val === '') return fallback
  return val
}

export function fmtRx(val) {
  if (val === null || val === undefined || val === 0) return '—'
  return `${Number(val).toFixed(2)} dBm`
}

export function exportToCsv(rows, filename = 'export.csv') {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const csv = [keys.join(','), ...rows.map(r =>
    keys.map(k => {
      const v = r[k] ?? ''
      return String(v).includes(',') ? `"${v}"` : v
    }).join(',')
  )].join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export function debounce(fn, ms) {
  let t
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms) }
}
