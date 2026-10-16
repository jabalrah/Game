@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0mulai-server.ps1"
if errorlevel 1 echo Skrip berhenti dengan kesalahan, kode %errorlevel%.
pause
