@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo   把《凛冬降临》推送到 GitHub
echo.
echo   先做一件事：打开 https://github.com/new 新建一个**空仓库**
echo   （不要勾选 Add a README / .gitignore / license），
echo   然后复制它的地址，形如 https://github.com/你的用户名/winterfall.git
echo.
set /p REPO=粘贴仓库地址后回车: 
if "%REPO%"=="" echo 没有输入地址，已取消。 & pause & exit /b 1

echo.
echo   正在推送... 如果弹出浏览器要求登录 GitHub，登录并授权即可。
git remote remove origin >nul 2>nul
git remote add origin %REPO%
git branch -M main
git push -u origin main
if errorlevel 1 (
  echo.
  echo   推送失败。常见原因：
  echo     - 仓库地址写错，或仓库还没创建
  echo     - 没有登录 GitHub：重新运行本脚本，在弹出的浏览器里完成授权
  echo.
) else (
  echo.
  echo   推送成功。接下来在 GitHub 仓库的 Settings -^> Pages 里，
  echo   把 Source 选成 "GitHub Actions"，等一分钟就有公网地址了：
  echo   https://你的用户名.github.io/仓库名/
  echo.
)
pause
