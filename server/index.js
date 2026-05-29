'use strict';
const express   = require('express');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const fs        = require('fs');
const path      = require('path');
const multer    = require('multer');
const { execFile } = require('child_process');

const app    = express();
const PORT   = process.env.PORT || 3001;
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));
app.use(express.json());
app.use(rateLimit({ windowMs: 60_000, max: 500 }));

process.on('uncaughtException',  e => console.error('[uncaughtException]',  e.message));
process.on('unhandledRejection', e => console.error('[unhandledRejection]', e));

function safe(fn) {
  return async (req, res) => {
    try { await fn(req, res); }
    catch (e) {
      console.error('[route error]', req.method, req.path, e.message);
      if (!res.headersSent) res.status(500).json({ error: e.message });
    }
  };
}

// ── Load data ─────────────────────────────────────────────────────────────────
const DATA_FILE = path.join(__dirname, 'data.json');
const REL_FILE  = path.join(__dirname, 'relatorio_clientes.json');
const BRR_FILE  = path.join(__dirname, 'bairros.json');
const CLI_FILE  = path.join(__dirname, 'clientes.json');
const ALWAYS_DISCONNECT_FILE = path.join(__dirname, 'clientes_sempre_desligam.json');
const RAW_IXC_FILE = path.join(__dirname, 'ixc_radpop_raw.json');
const SCRIPT_24H_FILE = path.join(__dirname, '..', 'script_24horas_cliente.py');
const SCRIPT_UNAUTHORIZED_FILE = path.join(__dirname, '..', 'script_onu_nao_autroizada.py');
const REMOVED_ONU_MACS = new Set([
  'FHTT03dd9700',
  'FHTT91f3d050',
]);

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { console.warn('readJson fallback:', file, e.message); return fallback; }
}

const rawData   = readJson(DATA_FILE, { base_onus:[], resumo_pon:[], offline:[] });
let baseOnus    = rawData.base_onus  || [];
let resumoPon   = rawData.resumo_pon || [];
let offlineList = rawData.offline    || [];
let lastUpdatedAt = rawData.updated_at || null;
let relatorio   = readJson(REL_FILE, { by_nome:{}, by_id:{} });
let bairroMap   = readJson(BRR_FILE, {});
let clientesMap = readJson(CLI_FILE, {});
const alwaysDisconnectList = readJson(ALWAYS_DISCONNECT_FILE, []);
let rawIxcData  = readJson(RAW_IXC_FILE, { registros:[] });

function saveBairros()  { fs.writeFileSync(BRR_FILE, JSON.stringify(bairroMap,   null, 2)); }
function saveClientes() { fs.writeFileSync(CLI_FILE, JSON.stringify(clientesMap, null, 2)); }

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatClientName(raw) {
  if (!raw) return '';
  return raw
    .replace(/[-_]?(PONTO[_]?\d+)$/i, '')
    .replace(/[-_]\d+$/, '')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function canonicalClientName(raw) {
  if (!raw) return '';
  return normStr(
    String(raw)
      .replace(/^\s*[\d./-]+\s*/g, '')
      .replace(/[_-]/g, ' ')
      .replace(/\bPONTO\s*(?:\d+|[IVXLCDM]+)\b/gi, ' ')
      .replace(/\bPONTO\b/gi, ' ')
      .replace(/\bPONO\s*(?:\d+|[IVXLCDM]+)\b/gi, ' ')
      .replace(/\bESCRITORIO\b/gi, ' ')
      .replace(/\bCASA\b/gi, ' ')
      .replace(/\bONT\b/gi, ' ')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function formatPhone(raw) {
  if (!raw) return '';
  const d = String(raw).replace(/\D/g, '');
  if (!d) return '';
  if (d.length >= 12 && d.startsWith('55')) return d;
  if (d.length === 11 || d.length === 10)   return '55' + d;
  return d;
}

function normStr(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function parseIntSafe(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatOltLabel(value, rawMatch) {
  const current = String(value || '').trim();
  if (current && current !== 'OLT') return current;

  const transmitterId = parseIntSafe(rawMatch?.id_transmissor);
  if (transmitterId !== null) return `OLT ${transmitterId}`;

  return current || null;
}

function buildAlwaysDisconnectIndex(list) {
  const byMac = new Map();
  const byName = new Map();

  (list || []).forEach((item) => {
    const mac = String(item?.mac || '').trim().toUpperCase();
    const name = canonicalClientName(item?.nome || '');
    const normalized = {
      ...item,
      mac,
      nome: formatClientName(item?.nome || ''),
      relato: String(item?.relato || '').trim(),
      situacao: String(item?.situacao || '').trim(),
    };

    if (mac) byMac.set(mac, normalized);
    if (name && !byName.has(name)) byName.set(name, normalized);
  });

  return { byMac, byName };
}

const alwaysDisconnectIndex = buildAlwaysDisconnectIndex(alwaysDisconnectList);

function findAlwaysDisconnectClient({ macSerial, nomeCliente }) {
  const mac = String(macSerial || '').trim().toUpperCase();
  if (mac && alwaysDisconnectIndex.byMac.has(mac)) {
    return alwaysDisconnectIndex.byMac.get(mac);
  }

  const name = canonicalClientName(nomeCliente || '');
  if (name && alwaysDisconnectIndex.byName.has(name)) {
    return alwaysDisconnectIndex.byName.get(name);
  }

  return null;
}

function buildRawOnuIndex(records) {
  const byMac = new Map();
  const byLoginId = new Map();

  for (const row of records || []) {
    const mac = (row?.mac || '').trim().toUpperCase();
    const loginId = parseIntSafe(row?.id_login);
    if (mac) byMac.set(mac, row);
    if (loginId !== null) byLoginId.set(String(loginId), row);
  }

  return { byMac, byLoginId };
}

function buildBaseOnuIndex(records) {
  const byLogin = new Map();
  const byLoginId = new Map();
  const byMac = new Map();

  for (const row of records || []) {
    const hydrated = hydrateOnu(row);
    const login = String(hydrated?.Login || '').trim().toLowerCase();
    const loginId = parseIntSafe(hydrated?.['ID Login']);
    const mac = String(hydrated?.['MAC/Serial'] || '').trim().toUpperCase();

    if (login && !byLogin.has(login)) byLogin.set(login, hydrated);
    if (loginId !== null && !byLoginId.has(String(loginId))) byLoginId.set(String(loginId), hydrated);
    if (mac && !byMac.has(mac)) byMac.set(mac, hydrated);
  }

  return { byLogin, byLoginId, byMac };
}

function buildLoginIndex(report) {
  const exactByName = new Map();
  const uniqueByFormattedName = new Map();
  const uniqueByCanonicalName = new Map();
  const duplicateFormattedNames = new Set();
  const duplicateCanonicalNames = new Set();
  const byContractId = new Map();
  const duplicateContractIds = new Set();

  for (const [login, info] of Object.entries(report?.by_login || {})) {
    const exactName = normStr(info?.nome);
    const formattedName = normStr(formatClientName(info?.nome));
    const canonicalName = canonicalClientName(info?.nome);
    const contractId = String(info?.id_contrato || '').trim();

    if (exactName && !exactByName.has(exactName)) exactByName.set(exactName, login);
    if (formattedName) {
      if (uniqueByFormattedName.has(formattedName) && uniqueByFormattedName.get(formattedName) !== login) {
        duplicateFormattedNames.add(formattedName);
        uniqueByFormattedName.delete(formattedName);
      } else if (!duplicateFormattedNames.has(formattedName)) {
        uniqueByFormattedName.set(formattedName, login);
      }
    }

    if (canonicalName) {
      if (uniqueByCanonicalName.has(canonicalName) && uniqueByCanonicalName.get(canonicalName) !== login) {
        duplicateCanonicalNames.add(canonicalName);
        uniqueByCanonicalName.delete(canonicalName);
      } else if (!duplicateCanonicalNames.has(canonicalName)) {
        uniqueByCanonicalName.set(canonicalName, login);
      }
    }

    if (contractId) {
      if (byContractId.has(contractId) && byContractId.get(contractId) !== login) {
        duplicateContractIds.add(contractId);
        byContractId.delete(contractId);
      } else if (!duplicateContractIds.has(contractId)) {
        byContractId.set(contractId, login);
      }
    }
  }

  return { exactByName, uniqueByFormattedName, uniqueByCanonicalName, byContractId };
}

let rawOnuIndex = buildRawOnuIndex(rawIxcData.registros || []);
let loginIndex = buildLoginIndex(relatorio);
let baseOnuIndex = { byLogin: new Map(), byLoginId: new Map(), byMac: new Map() };

function isPendingAuthStatus(status) {
  const normalized = normStr(status);
  return normalized === 'desautorizada' || normalized === 'pedindo autenticacao';
}

function hasOpticalSignal(row) {
  return Number(row?.['Sinal RX']) !== 0 && Number.isFinite(Number(row?.['Sinal RX']))
    || Number(row?.['Sinal TX']) !== 0 && Number.isFinite(Number(row?.['Sinal TX']));
}

function isOnlineStatus(status) {
  const normalized = normStr(status);
  return normalized === 'autorizada' || normalized === 'online';
}

function isOnlineOnu(row) {
  return isOnlineStatus(row?.['Status ONU']) || hasOpticalSignal(row);
}

function isValidOnuRecord(row) {
  const mac = (row?.['MAC/Serial'] || '').trim();
  const name = (row?.['Nome Cliente'] || '').trim();
  if (!mac) return false;
  if (mac === '1') return false;
  if (name === '1') return false;
  if (REMOVED_ONU_MACS.has(mac)) return false;
  return true;
}

function applyOnuFilters() {
  baseOnus = baseOnus.filter(isValidOnuRecord);
  offlineList = offlineList.filter(isValidOnuRecord);
}

applyOnuFilters();
baseOnuIndex = buildBaseOnuIndex(baseOnus);

function enrichOnu(r) {
  const loginKey = (r.Login || '').toLowerCase();
  const nomeFmt  = formatClientName(r['Nome Cliente'] || '');
  const manual   = clientesMap[loginKey]              || {};
  // Priority: by_login (exact) → by_nome (fallback for unmatched)
  const byLogin  = relatorio.by_login?.[loginKey]     || {};
  const byNome   = relatorio.by_nome?.[nomeFmt]        || {};
  const contrato = Object.keys(byLogin).length ? byLogin : byNome;
  return {
    ...r,
    nome_formatado: nomeFmt,
    whatsapp: manual.whatsapp || contrato.whatsapp || '',
    bairro:   bairroMap[loginKey] || contrato.bairro || '',
    cliente_nome_ixc: manual.name || contrato.nome || '',
    cliente_id_ixc: manual.id_cliente || '',
    contrato_id_ixc: manual.id_contrato || contrato.id_contrato || '',
    online: isOnlineOnu(r),
  };
}

function hydrateOnu(r) {
  const rawByMac = rawOnuIndex.byMac.get((r['MAC/Serial'] || '').trim().toUpperCase());
  const rawByLoginId = rawOnuIndex.byLoginId.get(String(r['ID Login'] || ''));
  const rawMatch = rawByMac || rawByLoginId || null;
  const olt = formatOltLabel(r.OLT, rawMatch);
  const slot = r.Slot ?? parseIntSafe(rawMatch?.slotno);
  const pon = r.PON ?? parseIntSafe(rawMatch?.ponno);
  const ponId = r['PON ID'] || rawMatch?.ponid || (slot !== null && pon !== null ? `1-1-${slot}-${pon}` : null);
  const nomeOriginal = r['Nome Cliente'] || rawMatch?.nome || '';
  const nomeFmt = formatClientName(nomeOriginal);
  const nomeCanonical = canonicalClientName(nomeOriginal);
  const byNome = relatorio.by_nome?.[nomeFmt] || {};
  const contractLogin = loginIndex.byContractId.get(String(byNome.id_contrato || '').trim());
  const inferredLogin =
    r.Login ||
    loginIndex.exactByName.get(normStr(nomeOriginal)) ||
    loginIndex.uniqueByFormattedName.get(normStr(nomeFmt)) ||
    loginIndex.uniqueByCanonicalName.get(nomeCanonical) ||
    contractLogin ||
    '';
  const hydrated = enrichOnu({
    ...r,
    OLT: olt,
    Slot: slot,
    PON: pon,
    'PON ID': ponId,
    'PON Grupo': r['PON Grupo'] || (olt && slot !== null && pon !== null ? `${olt} | Slot ${slot} | PON ${pon}` : null),
    Login: inferredLogin || null,
    'Nome Cliente': nomeOriginal || r['Nome Cliente'],
  });

  const alwaysDisconnectMatch = findAlwaysDisconnectClient({
    macSerial: hydrated['MAC/Serial'],
    nomeCliente: hydrated.nome_formatado || hydrated['Nome Cliente'],
  });
  hydrated.sempreDesliga = !!alwaysDisconnectMatch;
  hydrated.sempreDesligaRelato = alwaysDisconnectMatch?.relato || '';

  const loginKey = String(hydrated.Login || '').trim().toLowerCase();
  if (loginKey) {
    const contato = clientesMap[loginKey] || relatorio.by_login?.[loginKey] || {};
    hydrated.ignoreOfflineAlways = !!contato.ignoreOfflineAlways;
  } else {
    hydrated.ignoreOfflineAlways = false;
  }

  if (!hydrated.nome_formatado) hydrated.nome_formatado = nomeFmt;
  return hydrated;
}

function matchesOnuSearch(row, rawQuery) {
  const query = String(rawQuery || '').trim();
  if (!query) return true;

  const s = normStr(query);
  const numericQuery = query.replace(/\D/g, '');
  const fields = [
    String(row['ID Login'] || ''),
    String(row['ID ONU Fibra'] || ''),
    String(row.cliente_id_ixc || ''),
    String(row.contrato_id_ixc || ''),
    String(row['MAC/Serial'] || ''),
    String(row['PON ID'] || ''),
    String(row.Login || ''),
    String(row['Nome Cliente'] || ''),
    String(row.nome_formatado || ''),
    String(row.cliente_nome_ixc || ''),
    `${row['ID Login'] || ''} ${row['Nome Cliente'] || ''}`,
    `${row['ID Login'] || ''} - ${row['Nome Cliente'] || ''}`,
    `${row.cliente_id_ixc || ''} ${row.cliente_nome_ixc || ''}`,
    `${row.cliente_id_ixc || ''} - ${row.cliente_nome_ixc || ''}`,
    `${row['ID ONU Fibra'] || ''} ${row['Nome Cliente'] || ''}`,
    `${row['ID ONU Fibra'] || ''} - ${row['Nome Cliente'] || ''}`,
    String(row['Caixa FTTH/CTO'] || ''),
  ];

  if (fields.some(value => normStr(value).includes(s))) return true;
  if (canonicalClientName(row['Nome Cliente'] || '').includes(s)) return true;
  if (canonicalClientName(row.cliente_nome_ixc || '').includes(s)) return true;

  if (numericQuery) {
    const numericFields = [
      String(row['ID Login'] || '').replace(/\D/g, ''),
      String(row['ID ONU Fibra'] || '').replace(/\D/g, ''),
      String(row.cliente_id_ixc || '').replace(/\D/g, ''),
      String(row.contrato_id_ixc || '').replace(/\D/g, ''),
      String(row['MAC/Serial'] || '').replace(/\D/g, ''),
    ].filter(Boolean);

    if (numericFields.some(value => value === numericQuery || value.includes(numericQuery))) return true;
  }

  return false;
}

function paginate(arr, page, limit) {
  page  = Math.max(1, parseInt(page)  || 1);
  limit = Math.min(500, parseInt(limit) || 50);
  return { data: arr.slice((page-1)*limit, page*limit), total: arr.length, pages: Math.ceil(arr.length/limit)||1, page, limit };
}

function parseIxcDate(value) {
  if (!value || value === '0000-00-00 00:00:00') return null;
  const normalized = String(value).replace(' ', 'T');
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatOfflineDuration(lastConnectionAt, now = new Date()) {
  const diffMs = Math.max(0, now.getTime() - lastConnectionAt.getTime());
  const totalMinutes = Math.floor(diffMs / 60_000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  return `${String(days).padStart(2, '0')}d${String(hours).padStart(2, '0')}h${String(minutes).padStart(2, '0')}m`;
}

function formatDateTimePtBr(value) {
  return value.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function extractPythonString(source, varName) {
  const match = source.match(new RegExp(`${varName}\\s*=\\s*["']([^"']+)["']`));
  return match ? match[1].trim() : '';
}

function load24hOfflineConfig() {
  const envConfig = {
    url: process.env.IXC_URL || '',
    token: process.env.IXC_TOKEN || '',
    apiKey: process.env.IXC_API_KEY || '',
  };

  if (envConfig.url && envConfig.token && envConfig.apiKey) {
    return envConfig;
  }

  try {
    const scriptContents = fs.readFileSync(SCRIPT_24H_FILE, 'utf8');
    const scriptConfig = {
      url: extractPythonString(scriptContents, 'IXC_URL'),
      token: extractPythonString(scriptContents, 'IXC_TOKEN'),
      apiKey: extractPythonString(scriptContents, 'IXC_API_KEY'),
    };

    if (scriptConfig.url && scriptConfig.token && scriptConfig.apiKey) {
      return scriptConfig;
    }
  } catch (error) {
    console.warn('[24h-offline] unable to read python config:', error.message);
  }

  return {
    url: '',
    token: '',
    apiKey: '',
  };
}

function normalizeAtivo(value) {
  const normalized = normStr(value);
  if (normalized === 's' || normalized === 'sim' || normalized === 'ativo') return 'Ativo';
  if (normalized === 'n' || normalized === 'nao' || normalized === 'inativo') return 'Nao ativo';
  return value || 'Indefinido';
}

function normalizeOnlineFlag(value) {
  const normalized = normStr(value);
  if (normalized === 's' || normalized === 'sim' || normalized === 'online') return 'Online';
  if (normalized === 'n' || normalized === 'nao' || normalized === 'offline') return 'Offline';
  return value || 'Indefinido';
}

function extractLastKnownIp(cliente) {
  const candidates = [
    cliente?.ip,
    cliente?.ip_ultima_conexao,
    cliente?.framed_ip_address,
    cliente?.framedipaddress,
    cliente?.endereco_ip,
    cliente?.ip_address,
    cliente?.nasipaddress,
  ];

  return candidates.find(value => String(value || '').trim()) || '';
}

let clients24hOfflineCache = {
  data: [],
  summary: null,
  fetchedAt: 0,
  source: 'unavailable',
};

function invalidate24hOfflineCache() {
  clients24hOfflineCache = {
    data: [],
    summary: null,
    fetchedAt: 0,
    source: 'unavailable',
  };
}

let derivedCacheVersion = 0;
let derivedDashboardCache = null;
let derivedAlertCache = null;
let unauthorizedOnusCache = {
  data: null,
  fetchedAt: 0,
};

function invalidateDerivedCaches() {
  derivedCacheVersion += 1;
  derivedDashboardCache = null;
  derivedAlertCache = null;
  unauthorizedOnusCache = {
    data: null,
    fetchedAt: 0,
  };
}

async function getClients24hOffline() {
  const now = Date.now();
  if (now - clients24hOfflineCache.fetchedAt < 120_000) {
    return clients24hOfflineCache;
  }

  const configuredIxc = ixc.ixcConfig?.host && ixc.ixcConfig?.token
  ? {
      source: 'ixc-config',
      promise: () => ixc.ixcRequest('radusuarios', {
        qtype: 'radusuarios.online',
        query: 'N',
        oper: '=',
        page: '1',
        rp: '5000',
        sortname: 'radusuarios.ultima_conexao_final',
        sortorder: 'desc',
        limit: '5000',
      }).catch(() => null),  // ← adiciona isso
    }
  : null;

  const pythonConfig = load24hOfflineConfig();
  const configuredScript = pythonConfig.url && pythonConfig.token && pythonConfig.apiKey
    ? {
        source: 'python-script',
        promise: () => new Promise((resolve, reject) => {
          const endpoint = new URL('/webservice/v1/radusuarios', pythonConfig.url);
          const transport = endpoint.protocol === 'http:' ? require('http') : require('https');
          const auth = 'Basic ' + Buffer.from(`${pythonConfig.token}:${pythonConfig.apiKey}`).toString('base64');
          const payload = JSON.stringify({
            qtype: 'radusuarios.online',
            query: 'N',
            oper: '=',
            page: '1',
            rp: '5000',
            sortname: 'radusuarios.ultima_conexao_final',
            sortorder: 'desc',
          });

          const req = transport.request({
            protocol: endpoint.protocol,
            hostname: endpoint.hostname,
            port: endpoint.port || (endpoint.protocol === 'http:' ? 80 : 443),
            path: `${endpoint.pathname}${endpoint.search}`,
            method: 'GET',
            headers: {
              'Authorization': auth,
              'ixcsoft': 'listar',
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            },
            rejectUnauthorized: false,
          }, (response) => {
            let body = '';
            response.on('data', chunk => body += chunk);
            response.on('end', () => {
              try {
                resolve(JSON.parse(body));
              } catch (error) {
                reject(new Error(`Resposta invalida: ${body.slice(0, 200)}`));
              }
            });
          });

          req.on('error', reject);
          req.setTimeout(20000, () => {
            req.destroy(new Error('Timeout ao consultar clientes 24h offline'));
          });
          req.write(payload);
          req.end();
        }),
      }
    : null;

  const offlineSources = [configuredScript, configuredIxc].filter(Boolean);
  if (!offlineSources.length) {
    return {
      data: [],
      fetchedAt: now,
      source: 'unconfigured',
    };
  }

  let response = null;
  let offlineSource = null;
  for (const source of offlineSources) {
    try {
      const candidate = await source.promise();
      if (Array.isArray(candidate?.registros)) {
        response = candidate;
        offlineSource = source;
        break;
      }
      console.warn('[24h-offline]', source.source, 'sem registros validos');
    } catch (error) {
      console.warn('[24h-offline]', source.source, error.message);
    }
  }

    if (!response) {  // ← adiciona esse bloco
      return {
        data: [],
        summary: null,
        fetchedAt: now,
        source: 'unavailable',
      };
    }

  const nowDate = new Date();
  const cutoff = nowDate.getTime() - (24 * 3_600_000);
  const cutoff20h = nowDate.getTime() - (20 * 3_600_000);
  const cutoffDate = new Date(cutoff);
  const startOfDay = new Date(nowDate);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfDay);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const registros = response?.registros || [];
  const countByAtivo = registros.reduce((acc, cliente) => {
    const key = normalizeAtivo(cliente?.ativo);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const data = registros
    .map((cliente) => {
      const lastConnectionAt = parseIxcDate(cliente?.ultima_conexao_final);
      if (!lastConnectionAt) return null;

      const login = String(cliente?.login || '').trim();
      const loginId = parseIntSafe(cliente?.id_login);
      const matchedOnu =
        (login && baseOnuIndex.byLogin.get(login.toLowerCase())) ||
        (loginId !== null ? baseOnuIndex.byLoginId.get(String(loginId)) : null) ||
        null;
      const loginKey = login.toLowerCase();
      const fallbackContato = clientesMap[loginKey] || relatorio.by_login?.[loginKey] || {};
      const ignoreOfflineAlways = !!fallbackContato?.ignoreOfflineAlways;
      const nomeCliente = matchedOnu?.nome_formatado || matchedOnu?.['Nome Cliente'] || formatClientName(cliente?.nome || '');
      const alwaysDisconnectMatch = findAlwaysDisconnectClient({
        macSerial: matchedOnu?.['MAC/Serial'] || '',
        nomeCliente,
      });

      const offlineMs = nowDate.getTime() - lastConnectionAt.getTime();

      return {
        id: String(cliente?.id || cliente?.id_cliente || ''),
        login,
        idLogin: loginId !== null ? String(loginId) : '',
        contrato: String(cliente?.id_contrato || ''),
        ativo: normalizeAtivo(cliente?.ativo),
        onlineRadius: normalizeOnlineFlag(cliente?.online),
        ultimaConexao: cliente?.ultima_conexao_final || '',
        ultimaConexaoFmt: formatDateTimePtBr(lastConnectionAt),
        ultimoIp: extractLastKnownIp(cliente),
        tempoOffline: formatOfflineDuration(lastConnectionAt, nowDate),
        offlineMs,
        faixaOffline:
          offlineMs >= 20 * 60 * 60 * 1000 && lastConnectionAt.getTime() >= startOfDay.getTime()
            ? 'hoje20plus'
            : lastConnectionAt.getTime() >= startOfDay.getTime()
            ? 'hoje'
            : (lastConnectionAt.getTime() >= startOfYesterday.getTime() && lastConnectionAt.getTime() < startOfDay.getTime())
              ? 'diaAnterior24h'
            : lastConnectionAt.getTime() <= cutoff
              ? '24plus'
              : lastConnectionAt.getTime() <= cutoff20h
                ? '20plus'
                : 'geral',
        onuEncontrada: !!matchedOnu,
        onuStatus: matchedOnu?.['Status ONU'] || 'ONU SEM INFORMACAO',
        ponId: matchedOnu?.['PON ID'] || null,
        olt: matchedOnu?.OLT || null,
        slot: matchedOnu?.Slot ?? null,
        pon: matchedOnu?.PON ?? null,
        macSerial: matchedOnu?.['MAC/Serial'] || null,
        nomeCliente,
        whatsapp: matchedOnu?.whatsapp || fallbackContato?.whatsapp || '',
        ignoreOfflineAlways,
        sempreDesliga: !!alwaysDisconnectMatch || ignoreOfflineAlways,
        sempreDesligaRelato: alwaysDisconnectMatch?.relato || '',
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.offlineMs - a.offlineMs);

  const summary = data.reduce((acc, item) => {
    if (item.faixaOffline === 'hoje' || item.faixaOffline === 'hoje20plus') {
      acc.totalHoje += 1;
    }

    if (item.faixaOffline === 'diaAnterior24h') {
      acc.totalDiaAnterior24h += 1;
    }

    if (item.offlineMs >= 20 * 3_600_000) {
      acc.total20h += 1;
      if (item.ativo === 'Ativo') acc.ativos20h += 1;
      if (item.ativo === 'Nao ativo') acc.naoAtivos20h += 1;
    }

    if (item.offlineMs >= 24 * 3_600_000) {
      acc.total24h += 1;
      if (item.ativo === 'Ativo') acc.ativos24h += 1;
      if (item.ativo === 'Nao ativo') acc.naoAtivos24h += 1;
      if (!acc.maisAntigo24h || item.offlineMs > acc.maisAntigo24h.offlineMs) {
        acc.maisAntigo24h = {
          login: item.login,
          ultimaConexao: item.ultimaConexao,
          ultimaConexaoFmt: item.ultimaConexaoFmt,
          tempoOffline: item.tempoOffline,
          offlineMs: item.offlineMs,
        };
      }
    }
    return acc;
  }, {
    totalGeralOfflineAgora: registros.length,
    totalHoje: 0,
    totalDiaAnterior24h: 0,
    total20h: 0,
    total24h: 0,
    ativos20h: 0,
    naoAtivos20h: 0,
    ativos24h: 0,
    naoAtivos24h: 0,
    totalPorAtivoAgora: countByAtivo,
    maisAntigo24h: null,
    referenciaHoje: startOfDay.toLocaleDateString('pt-BR'),
    referenciaHojeDataHora: formatDateTimePtBr(startOfDay),
    referenciaDiaAnterior: startOfYesterday.toLocaleDateString('pt-BR'),
    referencia20hDataHora: formatDateTimePtBr(new Date(cutoff20h)),
    referencia24hData: cutoffDate.toLocaleDateString('pt-BR'),
    referencia24hDataHora: formatDateTimePtBr(cutoffDate),
  });

  clients24hOfflineCache = {
    data,
    summary,
    fetchedAt: now,
    source: offlineSource.source,
  };

  return clients24hOfflineCache;
}

function filterOnus(q) {
  let list = baseOnus.map(hydrateOnu);
  if (q.olt)    list = list.filter(r => r.OLT === q.olt);
  if (q.slot)   list = list.filter(r => String(r.Slot) === String(q.slot));
  if (q.pon)    list = list.filter(r => String(r.PON)  === String(q.pon));
  if (q.status) {
    list = list.filter(r => {
      const status = r['Status ONU'];
      if (isPendingAuthStatus(q.status)) return isPendingAuthStatus(status);
      return status === q.status;
    });
  }
  if (q.ponId)  list = list.filter(r => r['PON ID']    === q.ponId);
  if (q.search) {
    list = list.filter(r => matchesOnuSearch(r, q.search));
  }
  if (q.sortBy) {
    const dir = q.sortDir === 'desc' ? -1 : 1;
    list = [...list].sort((a, b) => {
      const va = a[q.sortBy] ?? '', vb = b[q.sortBy] ?? '';
      return typeof va === 'number' ? dir*(va-vb) : dir*String(va).localeCompare(String(vb));
    });
  }
  return list;
}

async function resolveOnusSearch(q) {
  let list = filterOnus(q);
  const search = String(q?.search || '').trim();
  const numericSearch = search.replace(/\D/g, '');

  if (!list.length && numericSearch && ixc?.lookupClientById) {
    const { data } = await ixc.lookupClientById(numericSearch);
    if (data) {
      const hydrated = baseOnus.map(hydrateOnu);
      const candidateLogins = new Set((data.logins || []).map(login => String(login).toLowerCase()));
      list = hydrated.filter(row =>
        String(row.cliente_id_ixc || '') === String(data.id_cliente || '') ||
        String(row.contrato_id_ixc || '') === String(data.id_contrato || '') ||
        candidateLogins.has(String(row.Login || '').toLowerCase()) ||
        canonicalClientName(row.cliente_nome_ixc || '').includes(canonicalClientName(data.name || '')) ||
        canonicalClientName(row['Nome Cliente'] || '').includes(canonicalClientName(data.name || ''))
      );
    }
  }

  return list;
}

function buildOfflinePonSummary() {
  const offlinePons = resumoPon
    .filter((row) => Number(row?.['Total ONUs'] || 0) > 0 && Number(row?.Autorizadas || 0) === 0)
    .map((row) => ({
      olt: row.OLT || 'OLT',
      slot: row.Slot ?? null,
      pon: row.PON ?? null,
      ponId: row['PON ID'] || null,
      totalOnus: Number(row['Total ONUs'] || 0),
      desautorizadas: Number(row.Desautorizadas || 0),
      semStatus: Number(row['Sem status'] || 0),
    }));

  const byOlt = offlinePons.reduce((acc, row) => {
    if (!acc[row.olt]) acc[row.olt] = [];
    acc[row.olt].push(row);
    return acc;
  }, {});

  return {
    total: offlinePons.length,
    byOlt,
    items: offlinePons,
  };
}

function getHydratedOnus() {
  return baseOnus.map(hydrateOnu);
}

function getDashboardDerivedData() {
  if (derivedDashboardCache?.version === derivedCacheVersion) {
    return derivedDashboardCache.value;
  }

  const hydratedOnus = getHydratedOnus();
  const offlinePonSummary = buildOfflinePonSummary();
  const slotsByOlt = hydratedOnus.reduce((acc, row) => {
    if (!row.OLT || row.Slot === null || row.Slot === undefined || row.Slot === '') return acc;
    if (!acc[row.OLT]) acc[row.OLT] = new Set();
    acc[row.OLT].add(row.Slot);
    return acc;
  }, {});
  const rxVals = baseOnus.map(r => r['Sinal RX']).filter(v => v && v !== 0);
  const onlineCount = baseOnus.filter(isOnlineOnu).length;

  const stats = {
    updatedAt: lastUpdatedAt,
    total: baseOnus.length,
    online: onlineCount,
    autorizadas: baseOnus.filter(r => r['Status ONU'] === 'Autorizada').length,
    desautorizadas: baseOnus.filter(r => isPendingAuthStatus(r['Status ONU'])).length,
    semStatus: baseOnus.filter(r => r['Status ONU'] === 'Sem status').length,
    oltCounts: hydratedOnus.reduce((acc, row) => {
      if (!row.OLT) return acc;
      acc[row.OLT] = (acc[row.OLT] || 0) + 1;
      return acc;
    }, {}),
    avgRx: rxVals.length ? (rxVals.reduce((a, b) => a + b, 0) / rxVals.length).toFixed(2) : null,
    worstRx: rxVals.length ? rxVals.reduce((a, b) => Math.min(a, b)).toFixed(2) : null,
    totalPons: resumoPon.length,
    semLeituraRx: resumoPon.reduce((acc, row) => acc + (row['Sem leitura RX/zero'] || 0), 0),
    offlineAtencao: Math.max(baseOnus.length - onlineCount, offlineList.length),
    olts: [...new Set(hydratedOnus.map(row => row.OLT))].filter(Boolean).sort(),
    slots: [...new Set(hydratedOnus.map(row => row.Slot))].filter(Boolean).sort((a, b) => a - b),
    slotsByOlt: Object.fromEntries(Object.entries(slotsByOlt).map(([olt, slots]) => [olt, [...slots].sort((a, b) => a - b)])),
    totalContratos: Object.keys(relatorio.by_id).length,
    comTelefone: Object.values(relatorio.by_login || relatorio.by_nome || {}).filter(row => row.whatsapp).length,
    offlinePonCount: offlinePonSummary.total,
    offlinePonsByOlt: offlinePonSummary.byOlt,
    offlinePons: offlinePonSummary.items,
  };

  const groupedRxBySlot = {};
  resumoPon.forEach(row => {
    const avgRxValue = row['Sinal RX médio'] ?? row['Sinal RX mÃ©dio'];
    if (avgRxValue == null) return;
    const key = `${row.OLT}-${row.Slot}`;
    if (!groupedRxBySlot[key]) groupedRxBySlot[key] = { olt: row.OLT, slot: row.Slot, vals: [] };
    groupedRxBySlot[key].vals.push(avgRxValue);
  });

  const chartRxSlot = Object.values(groupedRxBySlot)
    .map(item => ({
      label: `${item.olt} / Slot ${item.slot}`,
      olt: item.olt,
      slot: item.slot,
      avgRx: +(item.vals.reduce((a, b) => a + b, 0) / item.vals.length).toFixed(2),
    }))
    .sort((a, b) => a.olt.localeCompare(b.olt) || a.slot - b.slot);

  const distribution = {
    'Excelente (> -20)': 0,
    'Bom (-20 a -24)': 0,
    'Regular (-24 a -27)': 0,
    'Ruim (< -27)': 0,
    'Sem leitura': 0,
  };
  baseOnus.forEach(row => {
    const rx = row['Sinal RX'];
    if (!rx || rx === 0) distribution['Sem leitura'] += 1;
    else if (rx > -20) distribution['Excelente (> -20)'] += 1;
    else if (rx >= -24) distribution['Bom (-20 a -24)'] += 1;
    else if (rx >= -27) distribution['Regular (-24 a -27)'] += 1;
    else distribution['Ruim (< -27)'] += 1;
  });

  const chartRxDistribution = Object.entries(distribution).map(([label, count]) => ({ label, count }));
  const chartOnusPorVlan = Object.entries(
    baseOnus.reduce((acc, row) => {
      const vlan = row.VLAN ? String(Math.round(row.VLAN)) : 'N/A';
      acc[vlan] = (acc[vlan] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([vlan, count]) => ({ vlan, count }));

  const value = { hydratedOnus, stats, chartRxSlot, chartRxDistribution, chartOnusPorVlan };
  derivedDashboardCache = { version: derivedCacheVersion, value };
  return value;
}

function getAlertDerivedData() {
  if (derivedAlertCache?.version === derivedCacheVersion) {
    return derivedAlertCache.value;
  }

  const offline = offlineList.filter(isValidOnuRecord).map(hydrateOnu);
  const desautorizadas = baseOnus.filter(r => isValidOnuRecord(r) && isPendingAuthStatus(r['Status ONU'])).map(hydrateOnu);
  const semStatus = baseOnus.filter(r => isValidOnuRecord(r) && r['Status ONU'] === 'Sem status').map(hydrateOnu);
  const baixoSinal = baseOnus.filter(r => isValidOnuRecord(r) && r['Sinal RX'] && r['Sinal RX'] < -27).map(hydrateOnu);

  const value = {
    offline,
    desautorizadas,
    semStatus,
    baixoSinal,
    pioresPons: resumoPon.filter(r => r['Pior RX'] != null).sort((a, b) => a['Pior RX'] - b['Pior RX']).slice(0, 10),
    counts: {
      offline: offline.length,
      desautorizadas: desautorizadas.length,
      semStatus: semStatus.length,
      baixoSinal: baixoSinal.length,
    },
  };

  derivedAlertCache = { version: derivedCacheVersion, value };
  return value;
}

function firstFilled(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (String(value).trim() === '') continue;
    return value;
  }
  return '';
}

function normalizeUnauthorizedRow(row) {
  const cell = Array.isArray(row?.cell) ? row.cell : [];
  const macSerial = String(firstFilled(
    row?.mac,
    row?.mac_onu,
    row?.serial,
    row?.sn,
    row?.login_mac,
    cell[5],
    row?.['MAC/Serial']
  ) || '').trim().toUpperCase();
  const localOnu = macSerial ? baseOnuIndex.byMac.get(macSerial) : null;

  const nomeCliente = firstFilled(
    localOnu?.['Nome Cliente'],
    localOnu?.nome_formatado,
    row?.nome_cliente,
    row?.cliente,
    row?.nome,
    row?.razao
  );
  const login = firstFilled(localOnu?.Login, row?.login, row?.usuario, row?.user);
  const slot = firstFilled(localOnu?.Slot, row?.slot, row?.id_slot, row?.gboc, cell[2]);
  const pon = firstFilled(localOnu?.PON, row?.pon, row?.id_pon, cell[3]);
  const olt = firstFilled(localOnu?.OLT, row?.olt_nome, row?.olt, row?.nome_olt, cell[0], row?.id_olt ? `OLT ${row.id_olt}` : '');
  const ponId = firstFilled(localOnu?.['PON ID'], row?.ponid, row?.pon_id, cell[1] && cell[2] && cell[3] ? `1-1-${cell[2]}-${cell[3]}` : '');
  const modelo = firstFilled(row?.modelo, cell[4]);

  return {
    ...(localOnu || {}),
    OLT: olt || localOnu?.OLT || '-',
    GCOB: slot || localOnu?.GCOB || localOnu?.Slot || '-',
    Slot: slot || localOnu?.Slot || null,
    PON: pon || localOnu?.PON || '-',
    'PON ID': ponId || localOnu?.['PON ID'] || '-',
    'Nome Cliente': nomeCliente || localOnu?.['Nome Cliente'] || '-',
    Login: login || localOnu?.Login || '-',
    'MAC/Serial': macSerial || localOnu?.['MAC/Serial'] || '-',
    'ONU Tipo': firstFilled(localOnu?.['ONU Tipo'], modelo, '-'),
    'Status ONU': 'Pedindo autenticacao',
    'Sinal RX': firstFilled(localOnu?.['Sinal RX'], row?.sinal_rx, row?.rx, 0),
    'PotÃƒÂªncia': firstFilled(localOnu?.['PotÃƒÂªncia'], localOnu?.['PotÃƒÆ’Ã‚Âªncia'], row?.potencia, row?.power, 0),
  };
}

function execPythonScript(scriptPath) {
  return new Promise((resolve, reject) => {
    execFile('python', [scriptPath], { timeout: 40000, windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        const detail = stderr?.trim() || stdout?.trim() || error.message;
        return reject(new Error(detail));
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (parseError) {
        reject(new Error(`Saida invalida do script: ${stdout.slice(0, 400)}`));
      }
    });
  });
}

async function getUnauthorizedOnusFromIxc() {
  const now = Date.now();
  if (unauthorizedOnusCache.data && now - unauthorizedOnusCache.fetchedAt < 90_000) {
    return unauthorizedOnusCache.data;
  }

  try {
    const scriptResult = await execPythonScript(SCRIPT_UNAUTHORIZED_FILE);
    const rows = Array.isArray(scriptResult?.registros) ? scriptResult.registros : [];
    const normalized = (rows || [])
      .map(normalizeUnauthorizedRow)
      .filter((row) => row?.['MAC/Serial'] || row?.['Nome Cliente'] || row?.Login);

    const deduped = [];
    const seen = new Set();
    normalized.forEach((row) => {
      const key = String(row['MAC/Serial'] || row.Login || row['Nome Cliente'] || '').trim().toUpperCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      deduped.push(row);
    });
    unauthorizedOnusCache = {
      data: deduped,
      fetchedAt: now,
    };
    return deduped;
  } catch (error) {
    console.warn('[unauthorized-onus-script]', error.message);
    try {
      const rows = await ixc.fetchUnauthorizedOnus();
      const normalized = (rows || [])
        .map(normalizeUnauthorizedRow)
        .filter((row) => row?.['MAC/Serial'] || row?.['Nome Cliente'] || row?.Login);

      const deduped = [];
      const seen = new Set();
      normalized.forEach((row) => {
        const key = String(row['MAC/Serial'] || row.Login || row['Nome Cliente'] || '').trim().toUpperCase();
        if (!key || seen.has(key)) return;
        seen.add(key);
        deduped.push(row);
      });
      unauthorizedOnusCache = {
        data: deduped,
        fetchedAt: now,
      };
      return deduped;
    } catch (fallbackError) {
      console.warn('[unauthorized-onus-ixc]', fallbackError.message);
      return null;
    }
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/api/health', safe((req, res) => {
  res.json({ ok:true, onus:baseOnus.length, contratos:Object.keys(relatorio.by_nome).length });
}));

app.get('/api/stats', safe(async (req, res) => {
  const stats = { ...getDashboardDerivedData().stats };
  const remoteUnauthorized = await getUnauthorizedOnusFromIxc();
  if (remoteUnauthorized) stats.desautorizadas = remoteUnauthorized.length;
  res.json(stats);
}));



app.get('/api/clients-24h-offline', safe(async (req, res) => {
  try {
    const result = await getClients24hOffline();
    res.json({
      data: result.data,
      summary: result.summary,
      source: result.source,
      count: result.data.length,
    });
  } catch (error) {
    console.warn('[clients-24h-offline]', error.message);
    res.status(502).json({
      error: 'Nao foi possivel consultar clientes 24h offline.',
      detail: error.message,
    });
  }
}));

app.get('/api/onus', safe(async (req, res) => {
  res.json(paginate(await resolveOnusSearch(req.query), req.query.page, req.query.limit));
}));

app.get('/api/onus/export', safe((req, res) => {
  const list = filterOnus(req.query);
  res.json({ data:list, total:list.length });
}));

app.get('/api/onus/detail/:mac', safe((req, res) => {
  const mac = decodeURIComponent(req.params.mac);
  const onu = baseOnus.find(r=>r['MAC/Serial']===mac);
  if (!onu) return res.status(404).json({ error:'ONU não encontrada' });
  res.json({
    onu: hydrateOnu(onu),
    siblings: baseOnus.filter(r=>r['PON ID']===onu['PON ID']&&r['MAC/Serial']!==mac).slice(0,20).map(hydrateOnu),
    ponSummary: resumoPon.find(r=>r['PON ID']===onu['PON ID']),
  });
}));

app.get('/api/pons', safe((req, res) => {
  let list = resumoPon;
  if (req.query.olt)  list = list.filter(r=>r.OLT===req.query.olt);
  if (req.query.slot) list = list.filter(r=>String(r.Slot)===String(req.query.slot));
  res.json(paginate(list, req.query.page, req.query.limit||300));
}));

app.get('/api/pons/:ponId', safe((req, res) => {
  const ponId = decodeURIComponent(req.params.ponId);
  const pon   = resumoPon.find(r=>r['PON ID']===ponId);
  if (!pon) return res.status(404).json({ error:'PON não encontrada' });
  res.json({ pon, onus: baseOnus.filter(r=>r['PON ID']===ponId).map(hydrateOnu) });
}));

app.get('/api/alertas', safe(async (req, res) => {
  const baseAlerts = getAlertDerivedData();
  const remoteUnauthorized = await getUnauthorizedOnusFromIxc();

  if (!remoteUnauthorized) {
    return res.json(baseAlerts);
  }

  res.json({
    ...baseAlerts,
    desautorizadas: remoteUnauthorized,
    counts: {
      ...baseAlerts.counts,
      desautorizadas: remoteUnauthorized.length,
    },
  });
}));

app.get('/api/charts/rx-por-slot', safe((req, res) => {
  res.json(getDashboardDerivedData().chartRxSlot);
}));

app.get('/api/charts/rx-distribution', safe((req, res) => {
  res.json(getDashboardDerivedData().chartRxDistribution);
}));

app.get('/api/charts/onus-por-vlan', safe((req, res) => {
  res.json(getDashboardDerivedData().chartOnusPorVlan);
}));

app.get('/api/envio-massa', safe((req, res) => {
  let list = filterOnus(req.query);
  if (req.query.bairro) {
    const bq = req.query.bairro;
    list = list.filter(r => (bairroMap[(r.Login||'').toLowerCase()] || (relatorio.by_nome[formatClientName(r['Nome Cliente']||'')]||{}).bairro) === bq);
  }
  res.json({
    data: list.map(r=>{
      const e=hydrateOnu(r);
      return { nome_formatado:e.nome_formatado, login:e.Login||'', whatsapp:e.whatsapp, bairro:e.bairro,
               olt:e.OLT, slot:e.Slot, pon:e.PON, pon_id:e['PON ID']||'',
               mac_serial:e['MAC/Serial']||'', status:e['Status ONU']||'', cto:e['Caixa FTTH/CTO']||'',
               tem_contato:!!e.whatsapp };
    }),
    total: list.length
  });
}));

app.get('/api/bairros/list', safe((req, res) => {
  const all = [
    ...Object.values(relatorio.by_nome).map(v=>v.bairro),
    ...Object.values(bairroMap),
  ].filter(Boolean);
  res.json([...new Set(all)].sort());
}));

app.post('/api/bairros/manual', safe((req, res) => {
  const {login,bairro}=req.body;
  if (!login) return res.status(400).json({error:'login obrigatório'});
  bairro ? bairroMap[login.toLowerCase()]=bairro : delete bairroMap[login.toLowerCase()];
  invalidateDerivedCaches();
  invalidate24hOfflineCache();
  saveBairros(); res.json({ok:true});
}));

app.get('/api/clientes/status', safe((req, res) => {
  res.json({ total:Object.keys(clientesMap).length, comWhatsapp:Object.values(clientesMap).filter(c=>c.whatsapp).length });
}));

app.post('/api/clientes/manual', safe((req, res) => {
  const {login,name,whatsapp}=req.body;
  if (!login) return res.status(400).json({error:'login obrigatório'});
  const key = login.toLowerCase();
  const current = clientesMap[key] || {};
  clientesMap[key] = {
    ...current,
    name: name || '',
    whatsapp: formatPhone(whatsapp) || '',
  };
  invalidateDerivedCaches();
  invalidate24hOfflineCache();
  saveClientes(); res.json({ok:true});
}));

app.post('/api/clientes/offline-ignore', safe((req, res) => {
  const { login, ignoreOfflineAlways } = req.body;
  if (!login) return res.status(400).json({error:'login obrigatÃ³rio'});
  const key = login.toLowerCase();
  const current = clientesMap[key] || {};
  clientesMap[key] = {
    ...current,
    ignoreOfflineAlways: !!ignoreOfflineAlways,
  };
  invalidateDerivedCaches();
  invalidate24hOfflineCache();
  saveClientes(); res.json({ ok:true, login:key, ignoreOfflineAlways: !!ignoreOfflineAlways });
}));

app.post('/api/relatorio/upload', upload.fields([
  { name: 'file',   maxCount: 1 },   // relatorio de contratos (telefone)
  { name: 'logins', maxCount: 1 },   // relatorio de logins
]), safe((req, res) => {
  const files = req.files || {};
  const contrFile  = (files.file   || [])[0];
  const loginsFile = (files.logins || [])[0];

  if (!contrFile && !loginsFile) return res.status(400).json({ error:'Envie pelo menos um arquivo' });

  // ── Parse contratos (telefone + bairro) ───────────────────────────────────
  let byId = relatorio.by_id || {}, byNome = relatorio.by_nome || {};
  if (contrFile) {
    const text    = contrFile.buffer.toString('utf8');
    const lines   = text.split('\n').map(l=>l.trim()).filter(Boolean);
    const sep     = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(sep).map(h=>h.replace(/^["=]+|[" ]+$/g,'').trim().toLowerCase());
    const iC=headers.findIndex(h=>h.includes('cliente'));
    const iP=headers.findIndex(h=>h.includes('celular'));
    const iB=headers.findIndex(h=>h==='bairro');
    const iI=headers.findIndex(h=>h==='id');
    byId={}; byNome={};
    lines.slice(1).forEach(line=>{
      const p=line.split(sep).map(v=>v.replace(/^["=]+|"+$/g,'').trim());
      const nome=(p[iC]||'').toUpperCase().trim();
      const phone=formatPhone(p[iP]||'');
      const bairro=(p[iB]||'').trim();
      const cid=(p[iI]||'').replace(/\D/g,'');
      if (nome) byNome[nome]={nome,whatsapp:phone,bairro,id_contrato:cid};
      if (cid)  byId[cid]  ={nome,whatsapp:phone,bairro,id_contrato:cid};
    });
  }

  // ── Parse logins CSV (login → id_contrato → phone via byId) ──────────────
  let byLogin = relatorio.by_login || {};
  if (loginsFile) {
    const text    = loginsFile.buffer.toString('utf8');
    const lines   = text.split('\n').map(l=>l.trim()).filter(Boolean);
    const sep     = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(sep).map(h=>h.replace(/^["=]+|[" ]+$/g,'').trim().toLowerCase());
    const iLogin  = headers.findIndex(h=>h==='login');
    const iId     = headers.findIndex(h=>h==='id contrato');
    const iCliente= headers.findIndex(h=>h==='cliente');
    const iBairro = headers.findIndex(h=>h==='bairro');
    byLogin={};
    lines.slice(1).forEach(line=>{
      const p    = line.split(sep).map(v=>v.replace(/^["=]+|"+$/g,'').trim());
      const login= (p[iLogin]||'').toLowerCase().trim();
      const cid  = (p[iId]||'').replace(/\D/g,'');
      const nome = (p[iCliente]||'').toUpperCase().trim();
      const bairroLocal = (p[iBairro]||'').trim();
      if (!login) return;
      // Cross with byId for phone
      const contr = byId[cid] || {};
      byLogin[login]={
        nome,
        whatsapp: contr.whatsapp || '',
        bairro:   bairroLocal || contr.bairro || '',
        id_contrato: cid,
      };
    });
  }

  relatorio = { by_login: byLogin, by_id: byId, by_nome: byNome };
  loginIndex = buildLoginIndex(relatorio);
  baseOnuIndex = buildBaseOnuIndex(baseOnus);
  invalidateDerivedCaches();
  fs.writeFileSync(REL_FILE, JSON.stringify(relatorio, null, 2));

  const comTelLogin = Object.values(byLogin).filter(v=>v.whatsapp).length;
  const comTelNome  = Object.values(byNome).filter(v=>v.whatsapp).length;
  res.json({
    logins:       Object.keys(byLogin).length,
    contratos:    Object.keys(byNome).length,
    comTelefone:  comTelLogin || comTelNome,
  });
}));

app.post('/api/sync/onus', safe((req, res) => {
  const fresh = readJson(DATA_FILE, null);
  if (!fresh) return res.status(500).json({error:'data.json não encontrado'});
  baseOnus    = fresh.base_onus  || [];
  resumoPon   = fresh.resumo_pon || [];
  offlineList = fresh.offline    || [];
  lastUpdatedAt = fresh.updated_at || null;
  rawIxcData = readJson(RAW_IXC_FILE, { registros:[] });
  rawOnuIndex = buildRawOnuIndex(rawIxcData.registros || []);
  baseOnuIndex = buildBaseOnuIndex(baseOnus);
  applyOnuFilters();
  baseOnuIndex = buildBaseOnuIndex(baseOnus);
  invalidateDerivedCaches();
  res.json({ok:true, total:baseOnus.length});
}));

// IXC
const ixc = require('./ixc');
app.get('/api/ixc/config', safe((req,res)=>{
  const c=ixc.ixcConfig;
  res.json({host:c.host||'',token:c.token?c.token.replace(/:.+/,':****'):'',enabled:!!c.enabled});
}));
app.post('/api/ixc/config', safe((req,res)=>{
  const {host,token}=req.body;
  if (!host||!token) return res.status(400).json({error:'host e token obrigatórios'});
  ixc.saveConfig({host:host.trim(),token:token.trim(),enabled:true});
  res.json({ok:true});
}));
app.post('/api/ixc/test',    safe(async(req,res)=>{ res.json(await ixc.testConnection()); }));
app.post('/api/ixc/sync',    safe(async(req,res)=>{
  const logins=[...new Set(baseOnus.map(hydrateOnu).map(r=>(r.Login||'').toLowerCase()).filter(Boolean))];
  const {results,errors}=await ixc.syncContactsByLogins(logins);
  let updated=0;
  Object.entries(results).forEach(([l,d])=>{ clientesMap[l]={name:d.name||'',whatsapp:d.whatsapp||'',id_cliente:d.id_cliente||'',id_contrato:d.id_contrato||''}; if(d.whatsapp)updated++; });
  invalidateDerivedCaches();
  saveClientes();
  res.json({ok:true,loginsProcessed:logins.length,matched:Object.keys(results).length,withPhone:updated,errors:errors.length?errors:undefined});
}));
app.post('/api/ixc/sync-pon', safe(async(req,res)=>{
  const {olt,slot,pon}=req.body;
  if (!olt||!slot||!pon) return res.status(400).json({error:'olt, slot, pon obrigatórios'});
  const logins=[...new Set(baseOnus.map(hydrateOnu).filter(r=>r.OLT===olt&&String(r.Slot)===String(slot)&&String(r.PON)===String(pon)).map(r=>(r.Login||'').toLowerCase()).filter(Boolean))];
  if (!logins.length) return res.json({ok:true,matched:0});
  const {results,errors}=await ixc.syncContactsByLogins(logins);
  let updated=0;
  Object.entries(results).forEach(([l,d])=>{ clientesMap[l]={name:d.name||'',whatsapp:d.whatsapp||'',id_cliente:d.id_cliente||'',id_contrato:d.id_contrato||''}; if(d.whatsapp)updated++; });
  invalidateDerivedCaches();
  saveClientes();
  res.json({ok:true,ponLabel:`${olt} Slot ${slot} PON ${pon}`,loginsFound:logins.length,matched:Object.keys(results).length,withPhone:updated,errors:errors.length?errors:undefined});
}));
app.get('/api/ixc/lookup/:login', safe(async(req,res)=>{
  const login=decodeURIComponent(req.params.login).toLowerCase();
  const {data,errors}=await ixc.lookupLogin(login);
  if (data){clientesMap[login]={name:data.name||'',whatsapp:data.whatsapp||'',id_cliente:data.id_cliente||'',id_contrato:data.id_contrato||''};invalidateDerivedCaches();saveClientes();}
  res.json({data,errors,login});
}));

app.get('/api/monitor/log', safe((req,res)=>{
  const log=readJson(path.join(__dirname,'monitor_log.json'),[]);
  res.json({log:log.slice(0,50),lastCheck:log[0]?.ts||null});
}));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 ISP Dashboard API em http://localhost:${PORT}`);
  console.log(`📡 ${baseOnus.length} ONUs | ${resumoPon.length} PONs | ${Object.keys(relatorio.by_nome).length} contratos\n`);
});
