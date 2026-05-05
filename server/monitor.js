/**
 * Monitor de ONUs desautorizadas — roda a cada 5 minutos
 * Para usar: require('./monitor') no index.js
 * Loga no console e salva em monitor_log.json
 */
const fs   = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'monitor_log.json');
let log = [];
function loadLog() {
  if (fs.existsSync(LOG_FILE))
    try { log = JSON.parse(fs.readFileSync(LOG_FILE,'utf8')); } catch(e) {}
}
loadLog();

function saveLog(entry) {
  log.unshift(entry);
  if (log.length > 200) log = log.slice(0, 200);
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

function startMonitor(getOnus) {
  const CHECK_MS = 5 * 60 * 1000; // 5 min

  function check() {
    const onus   = getOnus();
    const desaut = onus.filter(r => r['Status ONU'] === 'Desautorizada');
    const sem    = onus.filter(r => r['Status ONU'] === 'Sem status');
    const entry  = {
      ts:            new Date().toISOString(),
      total:         onus.length,
      desautorizadas: desaut.length,
      semStatus:     sem.length,
      alertas:       desaut.map(r => ({
        login: r.Login, mac: r['MAC/Serial'], pon: r['PON ID'], nome: r['Nome Cliente']
      })),
    };
    if (desaut.length > 0 || sem.length > 0) {
      console.warn(`[Monitor ${entry.ts}] ⚠ ${desaut.length} desautorizadas | ${sem.length} sem status`);
    }
    saveLog(entry);
  }

  // Run immediately, then every 5min
  check();
  setInterval(check, CHECK_MS);
  console.log('📡 Monitor de desautorizadas ativo (a cada 5 min)');
}

function getLog() { return log; }

module.exports = { startMonitor, getLog };
