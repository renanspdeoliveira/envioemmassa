'use strict';
const express   = require('express');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const fs        = require('fs');
const path      = require('path');
const multer    = require('multer');

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
    online: isOnlineOnu(r),
  };
}

function paginate(arr, page, limit) {
  page  = Math.max(1, parseInt(page)  || 1);
  limit = Math.min(500, parseInt(limit) || 50);
  return { data: arr.slice((page-1)*limit, page*limit), total: arr.length, pages: Math.ceil(arr.length/limit)||1, page, limit };
}

function filterOnus(q) {
  let list = baseOnus;
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
    const s = normStr(q.search);
    list = list.filter(r =>
      normStr(r['Nome Cliente']).includes(s) ||
      normStr(formatClientName(r['Nome Cliente'] || '')).includes(s) ||
      normStr(r.Login).includes(s) ||
      normStr(r['MAC/Serial']).includes(s) ||
      normStr(r['PON ID']).includes(s) ||
      normStr(r['Caixa FTTH/CTO']).includes(s)
    );
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

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/api/health', safe((req, res) => {
  res.json({ ok:true, onus:baseOnus.length, contratos:Object.keys(relatorio.by_nome).length });
}));

app.get('/api/stats', safe((req, res) => {
  const rxVals  = baseOnus.map(r=>r['Sinal RX']).filter(v=>v&&v!==0);
  const onlineCount = baseOnus.filter(isOnlineOnu).length;
  res.json({
    updatedAt:       lastUpdatedAt,
    total:           baseOnus.length,
    online:          onlineCount,
    autorizadas:     baseOnus.filter(r=>r['Status ONU']==='Autorizada').length,
    desautorizadas:  baseOnus.filter(r=>isPendingAuthStatus(r['Status ONU'])).length,
    semStatus:       baseOnus.filter(r=>r['Status ONU']==='Sem status').length,
    oltCounts:       baseOnus.reduce((acc,r)=>{ acc[r.OLT]=(acc[r.OLT]||0)+1; return acc; },{}),
    avgRx:           rxVals.length ? (rxVals.reduce((a,b)=>a+b,0)/rxVals.length).toFixed(2) : null,
    worstRx:         rxVals.length ? rxVals.reduce((a,b)=>Math.min(a,b)).toFixed(2)           : null,
    totalPons:       resumoPon.length,
    semLeituraRx:    resumoPon.reduce((a,r)=>a+(r['Sem leitura RX/zero']||0),0),
    offlineAtencao:  Math.max(baseOnus.length - onlineCount, offlineList.length),
    olts:            [...new Set(baseOnus.map(r=>r.OLT))].filter(Boolean).sort(),
    slots:           [...new Set(baseOnus.map(r=>r.Slot))].filter(Boolean).sort((a,b)=>a-b),
    totalContratos:  Object.keys(relatorio.by_id).length,
    comTelefone:     Object.values(relatorio.by_login || relatorio.by_nome || {}).filter(v=>v.whatsapp).length,
  });
}));

app.get('/api/onus', safe((req, res) => {
  res.json(paginate(filterOnus(req.query).map(enrichOnu), req.query.page, req.query.limit));
}));

app.get('/api/onus/export', safe((req, res) => {
  const list = filterOnus(req.query).map(enrichOnu);
  res.json({ data:list, total:list.length });
}));

app.get('/api/onus/detail/:mac', safe((req, res) => {
  const mac = decodeURIComponent(req.params.mac);
  const onu = baseOnus.find(r=>r['MAC/Serial']===mac);
  if (!onu) return res.status(404).json({ error:'ONU não encontrada' });
  res.json({
    onu: enrichOnu(onu),
    siblings: baseOnus.filter(r=>r['PON ID']===onu['PON ID']&&r['MAC/Serial']!==mac).slice(0,20).map(enrichOnu),
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
  res.json({ pon, onus: baseOnus.filter(r=>r['PON ID']===ponId).map(enrichOnu) });
}));

app.get('/api/alertas', safe((req, res) => {
  const desaut   = baseOnus.filter(r=>isValidOnuRecord(r) && isPendingAuthStatus(r['Status ONU'])).map(enrichOnu);
  const semSt    = baseOnus.filter(r=>isValidOnuRecord(r) && r['Status ONU']==='Sem status').map(enrichOnu);
  const baixoSin = baseOnus.filter(r=>isValidOnuRecord(r) && r['Sinal RX']&&r['Sinal RX']<-27).map(enrichOnu);
  res.json({
    offline: offlineList.filter(isValidOnuRecord).map(enrichOnu),
    desautorizadas:desaut, semStatus:semSt, baixoSinal:baixoSin,
    pioresPons: resumoPon.filter(r=>r['Pior RX']!=null).sort((a,b)=>a['Pior RX']-b['Pior RX']).slice(0,10),
    counts: { offline:offlineList.length, desautorizadas:desaut.length, semStatus:semSt.length, baixoSinal:baixoSin.length }
  });
}));

app.get('/api/charts/rx-por-slot', safe((req, res) => {
  const g = {};
  resumoPon.forEach(r=>{
    if (r['Sinal RX médio']==null) return;
    const k=`${r.OLT}-${r.Slot}`;
    if (!g[k]) g[k]={olt:r.OLT,slot:r.Slot,vals:[]};
    g[k].vals.push(r['Sinal RX médio']);
  });
  res.json(Object.values(g).map(x=>({
    label:`${x.olt} / Slot ${x.slot}`, olt:x.olt, slot:x.slot,
    avgRx:+(x.vals.reduce((a,b)=>a+b,0)/x.vals.length).toFixed(2)
  })).sort((a,b)=>a.olt.localeCompare(b.olt)||a.slot-b.slot));
}));

app.get('/api/charts/rx-distribution', safe((req, res) => {
  const b={'Excelente (> -20)':0,'Bom (-20 a -24)':0,'Regular (-24 a -27)':0,'Ruim (< -27)':0,'Sem leitura':0};
  baseOnus.forEach(r=>{
    const rx=r['Sinal RX'];
    if (!rx||rx===0) b['Sem leitura']++;
    else if (rx>-20) b['Excelente (> -20)']++;
    else if (rx>=-24) b['Bom (-20 a -24)']++;
    else if (rx>=-27) b['Regular (-24 a -27)']++;
    else b['Ruim (< -27)']++;
  });
  res.json(Object.entries(b).map(([label,count])=>({label,count})));
}));

app.get('/api/charts/onus-por-vlan', safe((req, res) => {
  const c=baseOnus.reduce((acc,r)=>{const v=r.VLAN?String(Math.round(r.VLAN)):'N/A';acc[v]=(acc[v]||0)+1;return acc;},{});
  res.json(Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,15).map(([vlan,count])=>({vlan,count})));
}));

app.get('/api/envio-massa', safe((req, res) => {
  let list = filterOnus(req.query);
  if (req.query.bairro) {
    const bq = req.query.bairro;
    list = list.filter(r => (bairroMap[(r.Login||'').toLowerCase()] || (relatorio.by_nome[formatClientName(r['Nome Cliente']||'')]||{}).bairro) === bq);
  }
  res.json({
    data: list.map(r=>{
      const e=enrichOnu(r);
      return { nome_formatado:e.nome_formatado, login:r.Login||'', whatsapp:e.whatsapp, bairro:e.bairro,
               olt:r.OLT, slot:r.Slot, pon:r.PON, pon_id:r['PON ID']||'',
               mac_serial:r['MAC/Serial']||'', status:r['Status ONU']||'', cto:r['Caixa FTTH/CTO']||'',
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
  saveBairros(); res.json({ok:true});
}));

app.get('/api/clientes/status', safe((req, res) => {
  res.json({ total:Object.keys(clientesMap).length, comWhatsapp:Object.values(clientesMap).filter(c=>c.whatsapp).length });
}));

app.post('/api/clientes/manual', safe((req, res) => {
  const {login,name,whatsapp}=req.body;
  if (!login) return res.status(400).json({error:'login obrigatório'});
  clientesMap[login.toLowerCase()]={name:name||'',whatsapp:formatPhone(whatsapp)||''};
  saveClientes(); res.json({ok:true});
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
  applyOnuFilters();
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
  const logins=[...new Set(baseOnus.map(r=>(r.Login||'').toLowerCase()).filter(Boolean))];
  const {results,errors}=await ixc.syncContactsByLogins(logins);
  let updated=0;
  Object.entries(results).forEach(([l,d])=>{ clientesMap[l]={name:d.name||'',whatsapp:d.whatsapp||''}; if(d.whatsapp)updated++; });
  saveClientes();
  res.json({ok:true,loginsProcessed:logins.length,matched:Object.keys(results).length,withPhone:updated,errors:errors.length?errors:undefined});
}));
app.post('/api/ixc/sync-pon', safe(async(req,res)=>{
  const {olt,slot,pon}=req.body;
  if (!olt||!slot||!pon) return res.status(400).json({error:'olt, slot, pon obrigatórios'});
  const logins=[...new Set(baseOnus.filter(r=>r.OLT===olt&&String(r.Slot)===String(slot)&&String(r.PON)===String(pon)).map(r=>(r.Login||'').toLowerCase()).filter(Boolean))];
  if (!logins.length) return res.json({ok:true,matched:0});
  const {results,errors}=await ixc.syncContactsByLogins(logins);
  let updated=0;
  Object.entries(results).forEach(([l,d])=>{ clientesMap[l]={name:d.name||'',whatsapp:d.whatsapp||''}; if(d.whatsapp)updated++; });
  saveClientes();
  res.json({ok:true,ponLabel:`${olt} Slot ${slot} PON ${pon}`,loginsFound:logins.length,matched:Object.keys(results).length,withPhone:updated,errors:errors.length?errors:undefined});
}));
app.get('/api/ixc/lookup/:login', safe(async(req,res)=>{
  const login=decodeURIComponent(req.params.login).toLowerCase();
  const {data,errors}=await ixc.lookupLogin(login);
  if (data){clientesMap[login]={name:data.name||'',whatsapp:data.whatsapp||''};saveClientes();}
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
