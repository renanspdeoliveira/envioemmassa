/**
 * IXCSoft API Integration
 */

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

const CONFIG_FILE = path.join(__dirname, 'ixc_config.json');

let ixcConfig = { host: '', token: '', enabled: false };

function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      ixcConfig = { ...ixcConfig, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
    } catch {}
  }
}

function saveConfig(cfg) {
  ixcConfig = { ...ixcConfig, ...cfg };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(ixcConfig, null, 2));
}

loadConfig();

function ixcRequest(endpoint, params = {}) {
  return new Promise((resolve, reject) => {
    if (!ixcConfig.host || !ixcConfig.token) {
      return reject(new Error('IXC não configurado. Configure o host e token nas configurações.'));
    }

    const qs = new URLSearchParams({
      ...params,
      sortField: params.sortField || 'id',
      sortOrder: params.sortOrder || 'asc',
      limit: params.limit || '1000',
      ilimite: params.ilimite || 'nao',
    }).toString();

    const rawHost = ixcConfig.host
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '');

    const url = `/webservice/v1/${endpoint}?${qs}`;
    const auth = 'Basic ' + Buffer.from(`${ixcConfig.token}:${ixcConfig.apiKey || ''}`).toString('base64');
    const useHttps = !rawHost.startsWith('http://');
    const lib = useHttps ? https : http;
    const hostname = rawHost.replace(/^http:\/\//, '');

    const options = {
      hostname,
      port: useHttps ? 443 : 80,
      path: url,
      method: 'GET',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
        ixcsoft: 'listar',
      },
      rejectUnauthorized: false,
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'error') return reject(new Error(parsed.message));
          resolve(parsed);
        } catch {
          reject(new Error(`Resposta inválida da API IXC: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Timeout na API IXC (15s)'));
    });
    req.end();
  });
}

function ixcRequestWithBody(endpoint, body = {}, options = {}) {
  return new Promise((resolve, reject) => {
    if (!ixcConfig.host || !ixcConfig.token) {
      return reject(new Error('IXC nÃ£o configurado. Configure o host e token nas configuraÃ§Ãµes.'));
    }

    const rawHost = ixcConfig.host
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '');

    const method = options.method || 'POST';
    const payload = JSON.stringify(body || {});
    const url = `/webservice/v1/${endpoint}`;
    const auth = 'Basic ' + Buffer.from(`${ixcConfig.token}:${ixcConfig.apiKey || ''}`).toString('base64');
    const useHttps = !rawHost.startsWith('http://');
    const lib = useHttps ? https : http;
    const hostname = rawHost.replace(/^http:\/\//, '');

    const req = lib.request({
      hostname,
      port: useHttps ? 443 : 80,
      path: url,
      method,
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ixcsoft: options.ixcsoft || 'listar',
      },
      rejectUnauthorized: false,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'error') return reject(new Error(parsed.message));
          resolve(parsed);
        } catch {
          reject(new Error(`Resposta invÃ¡lida da API IXC: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Timeout na API IXC (15s)'));
    });
    req.write(payload);
    req.end();
  });
}

function formatPhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length >= 12 && digits.startsWith('55')) return digits;
  if (digits.length === 11 || digits.length === 10) return '55' + digits;
  return digits;
}

function normalizeIxcRows(response) {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.registros)) return response.registros;
  if (Array.isArray(response.rows)) return response.rows;
  if (Array.isArray(response.data)) return response.data;
  if (typeof response === 'object') return [response];
  return [];
}

async function syncContactsByLogins(logins) {
  const results = {};
  const errors = [];

  if (!logins || logins.length === 0) return { results, errors };

  try {
    const batchSize = 50;
    const loginMetaMap = {};

    for (let i = 0; i < logins.length; i += batchSize) {
      const batch = logins.slice(i, i + batchSize);
      try {
        const onuData = await ixcRequest('fn_onu', {
          qtype: 'fn_onu.login',
          query: batch.join(','),
          oper: 'in',
          limit: String(batchSize),
        });

        const rows = normalizeIxcRows(onuData);
        rows.forEach((row) => {
          if (!row.login || !row.id_cliente) return;
          loginMetaMap[String(row.login).toLowerCase()] = {
            id_cliente: String(row.id_cliente),
            id_contrato: row.id_contrato ? String(row.id_contrato) : '',
          };
        });
      } catch (e) {
        errors.push(`fn_onu batch ${i}-${i + batchSize}: ${e.message}`);
      }
    }

    const missingLogins = logins.filter(login => !loginMetaMap[String(login).toLowerCase()]);
    for (let i = 0; i < missingLogins.length; i += batchSize) {
      const batch = missingLogins.slice(i, i + batchSize);
      try {
        const radData = await ixcRequest('fn_rad_acesso', {
          qtype: 'fn_rad_acesso.login',
          query: batch.join(','),
          oper: 'in',
          limit: String(batchSize),
        });

        const rows = normalizeIxcRows(radData);
        rows.forEach((row) => {
          if (!row.login || !row.id_cliente) return;
          loginMetaMap[String(row.login).toLowerCase()] = {
            id_cliente: String(row.id_cliente),
            id_contrato: row.id_contrato ? String(row.id_contrato) : '',
          };
        });
      } catch (e) {
        errors.push(`fn_rad_acesso batch ${i}-${i + batchSize}: ${e.message}`);
      }
    }

    if (Object.keys(loginMetaMap).length === 0) {
      errors.push('Nenhum login encontrado na API IXC. Verifique se os logins existem em fn_onu ou fn_rad_acesso.');
      return { results, errors };
    }

    const clientIds = [...new Set(Object.values(loginMetaMap).map(v => v.id_cliente).filter(Boolean))];
    const contractByClientId = {};

    for (let i = 0; i < clientIds.length; i += batchSize) {
      const batch = clientIds.slice(i, i + batchSize);
      try {
        const contractData = await ixcRequest('cliente_contrato', {
          qtype: 'cliente_contrato.id_cliente',
          query: batch.join(','),
          oper: 'in',
          limit: String(batchSize * 5),
        });

        const rows = normalizeIxcRows(contractData);
        rows.forEach((row) => {
          const clientId = String(row.id_cliente || '');
          const contractId = String(row.id || '');
          if (!clientId || !contractId || contractByClientId[clientId]) return;
          contractByClientId[clientId] = contractId;
        });
      } catch (e) {
        errors.push(`cliente_contrato batch ${i}-${i + batchSize}: ${e.message}`);
      }
    }

    for (let i = 0; i < clientIds.length; i += batchSize) {
      const batch = clientIds.slice(i, i + batchSize);
      try {
        const clientData = await ixcRequest('cliente', {
          qtype: 'cliente.id',
          query: batch.join(','),
          oper: 'in',
          limit: String(batchSize),
        });

        const rows = normalizeIxcRows(clientData);
        const clientById = {};
        rows.forEach((row) => {
          if (row.id) clientById[String(row.id)] = row;
        });

        Object.entries(loginMetaMap).forEach(([login, meta]) => {
          const client = clientById[meta.id_cliente];
          if (!client) return;

          const phone =
            client.ramal_celular ||
            client.fone_celular ||
            client.celular ||
            client.fone ||
            '';

          results[login] = {
            name: client.razao || client.nome || '',
            whatsapp: formatPhone(phone),
            id_cliente: String(meta.id_cliente),
            id_contrato: meta.id_contrato || contractByClientId[meta.id_cliente] || '',
            matched: true,
          };
        });
      } catch (e) {
        errors.push(`cliente batch ${i}-${i + batchSize}: ${e.message}`);
      }
    }
  } catch (e) {
    errors.push('Erro geral: ' + e.message);
  }

  return { results, errors, totalFound: Object.keys(results).length };
}

async function lookupLogin(login) {
  const { results, errors } = await syncContactsByLogins([login]);
  return { data: results[login.toLowerCase()] || null, errors };
}

async function lookupClientById(clientId) {
  const id = String(clientId || '').replace(/\D/g, '');
  if (!id) return { data: null, errors: ['ID do cliente inválido.'] };

  const errors = [];

  try {
    const clientResp = await ixcRequest('cliente', {
      qtype: 'cliente.id',
      query: id,
      oper: '=',
      limit: '1',
    });

    const client = normalizeIxcRows(clientResp)[0];
    if (!client) return { data: null, errors: ['Cliente não encontrado na IXC.'] };

    let logins = [];
    try {
      const onuResp = await ixcRequest('fn_onu', {
        qtype: 'fn_onu.id_cliente',
        query: id,
        oper: '=',
        limit: '100',
      });
      logins = normalizeIxcRows(onuResp)
        .map(row => String(row.login || '').toLowerCase().trim())
        .filter(Boolean);
    } catch (e) {
      errors.push(`fn_onu: ${e.message}`);
    }

    if (!logins.length) {
      try {
        const radResp = await ixcRequest('fn_rad_acesso', {
          qtype: 'fn_rad_acesso.id_cliente',
          query: id,
          oper: '=',
          limit: '100',
        });
        logins = normalizeIxcRows(radResp)
          .map(row => String(row.login || '').toLowerCase().trim())
          .filter(Boolean);
      } catch (e) {
        errors.push(`fn_rad_acesso: ${e.message}`);
      }
    }

    return {
      data: {
        id_cliente: id,
        id_contrato: String(client.id_contrato || ''),
        name: client.razao || client.nome || '',
        logins: [...new Set(logins)],
      },
      errors,
    };
  } catch (e) {
    return { data: null, errors: [e.message] };
  }
}

async function testConnection() {
  const data = await ixcRequest('cliente', { limit: '1' });
  const rows = normalizeIxcRows(data);
  return {
    ok: true,
    sample: rows[0] ? Object.keys(rows[0]) : [],
    total: data.total || rows.length,
  };
}

async function fetchUnauthorizedOnusByOlt(oltId) {
  const payload = {
    grid_param: JSON.stringify([{ TB: 'id_olt', P: String(oltId) }]),
  };

  const response = await ixcRequestWithBody('fh_onu_nao_autorizadas', payload, {
    method: 'POST',
    ixcsoft: 'listar',
  });

  return normalizeIxcRows(response);
}

async function fetchUnauthorizedOnus() {
  const [olt1, olt2] = await Promise.all([
    fetchUnauthorizedOnusByOlt(1),
    fetchUnauthorizedOnusByOlt(2),
  ]);

  return [...olt1, ...olt2];
}

module.exports = { ixcConfig, loadConfig, saveConfig, ixcRequest, ixcRequestWithBody, syncContactsByLogins, lookupLogin, lookupClientById, testConnection, fetchUnauthorizedOnus };
