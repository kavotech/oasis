@echo off
REM Records the OASIS voiceover with a natural online voice (Google).
cd /d "%~dp0"
echo Recording the OASIS voiceover... please wait.
node gtts.mjs com.ng
echo.
echo Finished. You can close this window.
pause
