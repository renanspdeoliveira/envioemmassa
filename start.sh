#!/bin/bash
echo "========================================"
echo " FiberNet NOC Dashboard - Setup"
echo "========================================"

echo "[1/4] Instalando dependencias da raiz..."
npm install

echo "[2/4] Instalando dependencias do servidor..."
cd server && npm install && cd ..

echo "[3/4] Instalando dependencias do cliente..."
cd client && npm install && cd ..

echo "[4/4] Tudo instalado!"
echo ""
echo "========================================"
echo " Iniciando o sistema..."
echo " Backend:  http://localhost:3001"
echo " Frontend: http://localhost:5173"
echo "========================================"
echo ""
npm run dev
