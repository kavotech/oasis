@echo off
REM Records the OASIS voiceover with Windows' modern (clearer) voices.
cd /d "%~dp0"
if exist voice2 rmdir /s /q voice2
mkdir voice2
echo Recording the OASIS voiceover... please wait.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0voice2.ps1"
type voice2\ps-log.txt
echo.
echo Finished. You can close this window.
pause
