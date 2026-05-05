/**
 * IXCSoft API Integration
 * Docs: https://wikiapiprovedor.ixcsoft.com.br
 *
 * Auth: Basic token (base64 of "user:token")
 * Base URL: https://SEU_DOMINIO/webservice/v1
 *
 * Key endpoints:
 *   GET /fn_cliente    → clientes com ramal_celular, nome
 *   GET /fn_onu        → ONU/fibra com login, id_cliente
 *   GET /fn_rad_acesso → logins radius com login, id_cliente
 */

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

const CONFIG_FILE = path.join(__dirname, 'ixc_config.json');

// ── Config persistence ────────────────────────────────────────────────────────
let ixcConfig = { host: '', token: '', enabled: false };

function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try { ixcConfig = { ...ixcConfig, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) }; } catch (e) {}
  }
}
function saveConfig(cfg) {
  ixcConfig = { ...ixcConfig, ...cfg };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(ixcConfig, null, 2));
}
loadConfig();

// ── HTTP request helper ───────────────────────────────────────────────────────
function ixcRequest(endpoint, params = {}) {
  return new Promise((resolve, reject) => {
    if (!ixcConfig.host || !ixcConfig.token) {
      return reject(new Error('IXC não configurado. Configure o host e token nas configurações.'));
    }

    const qs = new URLSearchParams({
      ...params,
      sortField: params.sortField || 'id',
      sortOrder: params.sortOrder || 'asc',
      limit:     params.limit     || '1000',
      ilimite:   params.ilimite   || 'nao',
    }).toString();

    // Sanitize host
    const rawHost = ixcConfig.host
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '');

    const url = `/webservice/v1/${endpoint}?${qs}`;
    const auth = 'Basic ' + Buffer.from(ixcConfig.token).toString('base64');

    // Try HTTPS first, fallback to HTTP
    const useHttps = !rawHost.startsWith('http://');
    const lib = useHttps ? https : http;
    const hostname = rawHost.replace(/^http:\/\//, '');

    const options = {
      hostname,
      port:  useHttps ? 443 : 80,
      path:  url,
      method: 'GET',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
        'ixcsoft': 'listar',
      },
      rejectUnauthorized: false, // some ISP servers use self-signed certs
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'error') return reject(new Error(parsed.message));
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Resposta inválida da API IXC: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout na API IXC (15s)')) });
    req.end();
  });
}

// ── Main sync: login → whatsapp ───────────────────────────────────────────────
/**
 * Steps:
 * 1. GET fn_onu with login filter  → get id_cliente list
 *    OR GET fn_rad_acesso with login → get id_cliente
 * 2. GET fn_cliente with those IDs → get ramal_celular + nome
 * 3. Return map: login → { name, whatsapp }
 */
async function syncContactsByLogins(logins) {
  const results = {}; // login → { name, whatsapp, matched }
  const errors  = [];

  if (!logins || logins.length === 0) return { results, errors };

  try {
    // ── Step 1: fn_onu → match login to id_cliente ──────────────────────────
    // IXC supports filtering by multiple values using comma separation
    const batchSize = 50;
    const loginClienteMap = {}; // login → id_cliente

    for (let i = 0; i < logins.length; i += batchSize) {
      const batch = logins.slice(i, i + batchSize);
      try {
        const onuData = await ixcRequest('fn_onu', {
          qtype: 'fn_onu.login',
          query: batch.join(','),
          oper: 'in',
          limit: String(batchSize),
        });

        const rows = onuData.registros || onuData || [];
        rows.forEach(r => {
          if (r.login && r.id_cliente) {
            loginClienteMap[r.login.toLowerCase()] = r.id_cliente;
          }
        });
      } catch (e) {
        errors.push(`fn_onu batch ${i}-${i+batchSize}: ${e.message}`);
      }
    }

    // Also try fn_rad_acesso for logins not found in fn_onu
    const missingLogins = logins.filter(l => !loginClienteMap[l.toLowerCase()]);
    if (missingLogins.length > 0) {
      for (let i = 0; i < missingLogins.length; i += batchSize) {
        const batch = missingLogins.slice(i, i + batchSize);
        try {
          const radData = await ixcRequest('fn_rad_acesso', {
            qtype: 'fn_rad_acesso.login',
            query: batch.join(','),
            oper: 'in',
            limit: String(batchSize),
          });
          const rows = radData.registros || radData || [];
          rows.forEach(r => {
            if (r.login && r.id_cliente) {
              loginClienteMap[r.login.toLowerCase()] = r.id_cliente;
            }
          });
        } catch (e) {
          errors.push(`fn_rad_acesso batch: ${e.message}`);
        }
      }
    }

    if (Object.keys(loginClienteMap).length === 0) {
      errors.push('Nenhum login encontrado na API IXC. Verifique se os logins existem em fn_onu ou fn_rad_acesso.');
      return { results, errors };
    }

    // ── Step 2: fn_cliente → get name + ramal_celular ─────────────────────────
    const clienteIds = [...new Set(Object.values(loginClienteMap))];

    for (let i = 0; i < clienteIds.length; i += batchSize) {
      const batch = clienteIds.slice(i, i + batchSize);
      try {
        const clData = await ixcRequest('fn_cliente', {
          qtype: 'fn_cliente.id',
          query: batch.join(','),
          oper: 'in',
          limit: String(batchSize),
        });

        const rows = clData.registros || clData || [];
        const clienteById = {};
        rows.forEach(r => {
          if (r.id) clienteById[String(r.id)] = r;
        });

        // Map back login → cliente data
        Object.entries(loginClienteMap).forEach(([login, clienteId]) => {
          const cliente = clienteById[String(clienteId)];
          if (!cliente) return;

          // IXC field names for phone: ramal_celular, fone_celular, celular, fone
          const phone =
            cliente.ramal_celular ||
            cliente.fone_celular  ||
            cliente.celular       ||
            cliente.fone          ||
            '';

          const name = cliente.razao || cliente.nome || '';

          results[login] = {
            name:      name,
            whatsapp:  formatPhone(phone),
            id_cliente: String(clienteId),
            matched:   true,
          };
        });
      } catch (e) {
        errors.push(`fn_cliente batch ${i}: ${e.message}`);
      }
    }

  } catch (e) {
    errors.push('Erro geral: ' + e.message);
  }

  return { results, errors, totalFound: Object.keys(results).length };
}

// ── Single login lookup ───────────────────────────────────────────────────────
async function lookupLogin(login) {
  const { results, errors } = await syncContactsByLogins([login]);
  return { data: results[login.toLowerCase()] || null, errors };
}

// ── Test connection ───────────────────────────────────────────────────────────
async function testConnection() {
  const data = await ixcRequest('fn_cliente', { limit: '1' });
  const rows = data.registros || data || [];
  return {
    ok: true,
    sample: rows[0] ? Object.keys(rows[0]) : [],
    total: data.total || rows.length,
  };
}

// ── Phone formatter (same as main server) ────────────────────────────────────
function formatPhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length >= 12 && digits.startsWith('55')) return digits;
  if (digits.length === 11 || digits.length === 10) return '55' + digits;
  return digits;
}

module.exports = { ixcConfig, loadConfig, saveConfig, ixcRequest, syncContactsByLogins, lookupLogin, testConnection };
