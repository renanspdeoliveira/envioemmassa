const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Erro na requisição')
  }
  return res.json()
}

export const api = {
  stats:       ()          => request('/stats'),
  onus:        (p={})      => request('/onus?' + new URLSearchParams(p)),
  onuDetail:   (mac)       => request(`/onus/detail/${encodeURIComponent(mac)}`),
  onuExport:   (p={})      => request('/onus/export?' + new URLSearchParams(p)),
  pons:        (p={})      => request('/pons?' + new URLSearchParams(p)),
  ponDetail:   (id)        => request(`/pons/${encodeURIComponent(id)}`),
  alertas:     ()          => request('/alertas'),
  chartRxSlot: ()          => request('/charts/rx-por-slot'),
  chartRxDist: ()          => request('/charts/rx-distribution'),
  chartVlan:   ()          => request('/charts/onus-por-vlan'),
  syncOnus:    ()          => request('/sync/onus', { method: 'POST' }),
}

export const apiEnvio = {
  list:         (p={})  => request('/envio-massa?' + new URLSearchParams(p)),
  bairrosList:  ()      => request('/bairros/list'),
  bairroManual: (login, bairro) => request('/bairros/manual', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, bairro }),
  }),
}

export const apiClientes = {
  status: () => request('/clientes/status'),
  manual: (login, name, whatsapp) => request('/clientes/manual', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, name, whatsapp }),
  }),
}

export const apiRelatorio = {
  upload: (file) => {
    const form = new FormData()
    form.append('file', file)
    return fetch(`${BASE}/relatorio/upload`, { method: 'POST', body: form }).then(r => r.json())
  },
}

export const apiIxc = {
  getConfig:  ()             => request('/ixc/config'),
  saveConfig: (host, token)  => request('/ixc/config', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ host, token, enabled:true }) }),
  test:       ()             => request('/ixc/test', { method:'POST' }),
  syncAll:    ()             => request('/ixc/sync', { method:'POST' }),
  syncPon:    (olt,slot,pon) => request('/ixc/sync-pon', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ olt, slot, pon }) }),
  lookup:     (login)        => request(`/ixc/lookup/${encodeURIComponent(login)}`),
}
