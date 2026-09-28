@echo off
rem Abre o site da HS Sindicatura no navegador (servidor local na porta 3080).
cd /d "%~dp0"
start "" http://localhost:3080
node scripts\serve.mjs 3080
