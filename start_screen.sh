#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_SESSION="isp-backend"
FRONTEND_SESSION="isp-frontend"
DATA_SESSION="isp-data-sync"

echo "========================================"
echo " FiberNet NOC Dashboard - Screen"
echo "========================================"

if ! command -v screen >/dev/null 2>&1; then
  echo "O comando 'screen' nao esta instalado."
  echo "Ubuntu/Debian: sudo apt install screen"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm nao encontrado no sistema."
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 nao encontrado no sistema."
  exit 1
fi

echo "[1/4] Instalando dependencias da raiz..."
(cd "$ROOT_DIR" && npm install)

echo "[2/4] Instalando dependencias do servidor..."
(cd "$ROOT_DIR/server" && npm install)

start_session() {
  local session_name="$1"
  local command="$2"

  if screen -list | grep -q "[.]${session_name}[[:space:]]"; then
    echo "Sessao '${session_name}' ja esta em execucao. Pulando."
    return
  fi

  screen -dmS "$session_name" bash -lc "cd \"$ROOT_DIR\" && $command"
  echo "Sessao '${session_name}' iniciada."
}

echo "[3/4] Iniciando servicos em screen..."
start_session "$BACKEND_SESSION" "cd server && node index.js"
start_session "$DATA_SESSION" "python3 script_data.py --interval 300"
start_session "$FRONTEND_SESSION" "npm run dev -- --host 0.0.0.0"

echo "[4/4] Tudo iniciado."
echo ""
echo "Backend:  http://localhost:3001"
echo "Frontend: http://localhost:5173"
echo ""
echo "Sessoes screen:"
echo "  $BACKEND_SESSION"
echo "  $DATA_SESSION"
echo "  $FRONTEND_SESSION"
echo ""
echo "Comandos uteis:"
echo "  screen -r $BACKEND_SESSION"
echo "  screen -r $DATA_SESSION"
echo "  screen -r $FRONTEND_SESSION"
echo "  screen -ls"
