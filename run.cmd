@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo   凛冬降临 · 本地预览（已开放局域网，手机可直接打开）
echo.
echo   PC：http://127.0.0.1:8123/
echo   手机：与本机同一 Wi-Fi 时，打开下面列出的 http://192.168.x.x:8123/
echo   关闭本窗口即可停止服务。
echo.
where node >nul 2>nul
if %errorlevel%==0 (
  start "" http://127.0.0.1:8123/
  node ".\tools\serve.mjs"
) else (
  start "" http://127.0.0.1:8123/
  python -m http.server 8123 --bind 0.0.0.0
)
pause
