@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo   把《凛冬降临》推送到 GitHub（FunDus0517/lindongjianglin）
echo.
echo   首次运行会弹出浏览器，请登录 GitHub 并点授权；之后这台机器就记住了。
echo   如果连接失败，多试几次（本机到 GitHub 的网络目前不稳定），或先打开你的代理再运行。
echo.
pause

set PATH=C:\Program Files\Git\cmd;%PATH%
git remote remove origin >nul 2>nul
git remote add origin https://github.com/FunDus0517/lindongjianglin.git
git branch -M main

echo.
echo   [1/2] 推送代码...
git push -u origin main
if errorlevel 1 goto fail

echo.
echo   [2/2] 完成。
echo.
echo   接下来在浏览器里做两件事：
echo     1. 打开 https://github.com/FunDus0517/lindongjianglin/settings/pages
echo     2. Source 选 "GitHub Actions"，等一分钟
echo   之后公网地址（手机可随时打开、可加到主屏幕）：
echo     https://fundus0517.github.io/lindongjianglin/
echo.
pause
exit /b 0

:fail
echo.
echo   推送失败。请检查：
echo     - 仓库是否已经创建：https://github.com/new  （名字填 lindongjianglin，不要勾任何初始化选项）
echo     - 浏览器授权是否完成（重新运行本脚本会再次弹出）
echo     - 网络：本机到 github.com 时通时断，重试一两次通常就好
echo.
pause
exit /b 1
