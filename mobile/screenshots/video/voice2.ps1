# Fallback: records lines\*.txt to voice2\*.wav with Windows' modern (OneCore) voices.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
New-Item -ItemType Directory -Force -Path voice2 | Out-Null
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, [Type]$t) { $task = $asTask.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(-1) | Out-Null; $task.Result }
$all = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices
"Modern voices:" | Out-File voice2\ps-log.txt -Append
$all | ForEach-Object { "  $($_.DisplayName) | $($_.Language) | $($_.Gender)" } | Out-File voice2\ps-log.txt -Append
$pick = $null
foreach ($pref in @('en-KE','en-NG','en-TZ','en-ZA','en-GB','en-US','en-AU','en-IE','en-CA','en-IN')) {
  $pick = $all | Where-Object { $_.Language -eq $pref -and $_.Gender -eq 'Male' } | Select-Object -First 1
  if ($pick) { break }
}
$synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
if ($pick) { $synth.Voice = $pick }
"Using: $($synth.Voice.DisplayName)" | Out-File voice2\ps-log.txt -Append
Get-ChildItem lines\*.txt | Sort-Object Name | ForEach-Object {
  $text = Get-Content -Raw -LiteralPath $_.FullName
  $stream = Await ($synth.SynthesizeTextToStreamAsync($text)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
  $reader = New-Object Windows.Storage.Streams.DataReader($stream.GetInputStreamAt(0))
  $size = [uint32]$stream.Size
  $null = Await ($reader.LoadAsync($size)) ([uint32])
  $bytes = New-Object byte[] $size; $reader.ReadBytes($bytes)
  [IO.File]::WriteAllBytes((Join-Path (Resolve-Path voice2) ($_.BaseName + '.wav')), $bytes)
  "OK $($_.Name)" | Out-File voice2\ps-log.txt -Append
}
"ALL DONE" | Out-File voice2\ps-log.txt -Append
