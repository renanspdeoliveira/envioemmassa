@echo off
echo ============================================
echo  Atualizador da Base de ONUs via IXC
echo  Atualiza a cada 5 minutos
echo  Pressione CTRL+C para parar
echo ============================================
echo.
python script_data.py --interval 300
pause
