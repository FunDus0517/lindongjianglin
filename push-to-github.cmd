@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
set PATH=C:\Program Files\Git\cmd;%PATH%
set REPO_URL=https://github.com/FunDus0517/lindongjianglin.git
set REPO_API=https://api.github.com/repos/FunDus0517/lindongjianglin
set PAGES_URL=https://github.com/FunDus0517/lindongjianglin/settings/pages
set SITE_URL=https://fundus0517.github.io/lindongjianglin/

echo.
echo   《凛冬降临》→ GitHub（FunDus0517/lindongjianglin）
echo   ====================================================
echo.

echo   [1/3] 检查网络与仓库...
curl.exe -s -o NUL --max-time 15 %REPO_API%
if errorlevel 1 (
  echo.
  echo   连不上 github.com。本机到 GitHub 的网络时通时断：
  echo     1^) 先打开你的代理/加速工具，再运行本脚本
  echo     2^) 或者直接重跑几次
  echo.
  pause & exit /b 1
)
for /f %%c in ('curl.exe -s -o NUL -w "%%{http_code}" --max-time 15 %REPO_API%') do set CODE=%%c
if "%CODE%"=="404" (
  echo.
  echo   仓库还不存在。已为你打开新建页面：
  echo     https://github.com/new?name=lindongjianglin
  echo   请确认 Owner 是 FunDus0517，仓库名 lindongjianglin，
  echo   不要勾选 README / .gitignore / license，点 Create repository 后重新运行本脚本。
  echo.
  start "" "https://github.com/new?name=lindongjianglin"
  pause & exit /b 1
)
echo   仓库已存在 ^(HTTP %CODE%^)，继续。

echo.
echo   [2/3] 推送代码...
echo   如果弹出「Connect to GitHub」窗口，请点 Sign in with your browser，
echo   然后在浏览器里点 Authorize 完成授权。不要关掉那个窗口。
echo.
git remote remove origin >nul 2>nul
git remote add origin %REPO_URL%
git branch -M main
git push -u origin main
if errorlevel 1 goto fail

echo.
echo   [3/3] 推送完成。已为你打开 Pages 设置页。
echo.
echo   在那一页做一次：
echo     Build and deployment -^> Source 选 "GitHub Actions"，保存。
echo   等一分钟，公网地址就有了（手机随时能开，可加到主屏幕）：
echo     %SITE_URL%
echo.
start "" "%PAGES_URL%"
pause
exit /b 0

:fail
echo.
echo   推送失败。请检查：
echo     - 授权窗口是否被关掉（重跑本脚本会再次弹出）
echo     - 网络是否中断（重跑一两次通常就好）
echo     - 仓库是否为空仓库（里面已有 README 也能推，但若已有别的提交会提示冲突）
echo.
pause
exit /b 1
