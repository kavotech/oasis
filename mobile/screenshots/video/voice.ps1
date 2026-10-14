# Records lines\*.txt to voice\*.wav using Windows' built-in offline voices.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
New-Item -ItemType Directory -Force -Path voice | Out-Null
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voices = $s.GetInstalledVoices() | Where-Object { $_.Enabled } | ForEach-Object { $_.VoiceInfo }
"Installed voices:" | Out-File voice\log.txt
$voices | ForEach-Object { "  $($_.Name) | $($_.Culture) | $($_.Gender)" } | Out-File voice\log.txt -Append
# Prefer an African-English male voice, then any English male voice, then anything English.
$pick = $voices | Where-Object { $_.Gender -eq 'Male' -and $_.Culture.Name -match '^en-(KE|NG|TZ|ZA|UG|GH)' } | Select-Object -First 1
if (-not $pick) { $pick = $voices | Where-Object { $_.Gender -eq 'Male' -and $_.Culture.Name -like 'en-*' } | Select-Object -First 1 }
if (-not $pick) { $pick = $voices | Where-Object { $_.Culture.Name -like 'en-*' } | Select-Object -First 1 }
$s.SelectVoice($pick.Name)
$s.Rate = -1
"Using: $($pick.Name)" | Out-File voice\log.txt -Append
Get-ChildItem lines\*.txt | Sort-Object Name | ForEach-Object {
  $out = Join-Path (Resolve-Path voice) ($_.BaseName + '.wav')
  $s.SetOutputToWaveFile($out)
  $s.Speak((Get-Content -Raw -LiteralPath $_.FullName))
  $s.SetOutputToNull()
  "OK $($_.Name)" | Out-File voice\log.txt -Append
}
$s.Dispose()
"ALL DONE" | Out-File voice\log.txt -Append
