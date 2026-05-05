@echo off
echo ============================================
echo  FiberNet NOC Dashboard
echo ============================================
echo.

echo Verificando dependencias...

IF NOT EXIST "node_modules" (
    echo Instalando dependencias raiz...
    call npm install
)
IF NOT EXIST "server\node_modules" (
    echo Instalando dependencias do servidor...
    cd server && call npm install && cd ..
)
IF NOT EXIST "client\node_modules" (
    echo Instalando dependencias do cliente...
    cd client && call npm install && cd ..
)

echo.
echo Iniciando servidor backend (porta 3001)...
start "ISP Backend" cmd /k "cd /d %~dp0server && node index.js"

echo Aguardando servidor iniciar...
timeout /t 3 /nobreak > nul

echo Iniciando frontend (porta 5173)...
start "ISP Frontend" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo ============================================
echo  Sistema iniciado!
echo  Backend:  http://localhost:3001/api/health
echo  Frontend: http://localhost:5173
echo ============================================
echo.
echo Pressione qualquer tecla para fechar esta janela.
echo (Os servidores continuam rodando nas outras janelas)
pause > nul
