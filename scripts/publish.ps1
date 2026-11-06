param(
  [Parameter(Mandatory = $true)]
  [string]$Target,
  [ValidateSet('site', 'admin', 'all')]
  [string]$App = 'all'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$apps = if ($App -eq 'all') { @('site', 'admin') } else { @($App) }
$manifestApps = [ordered]@{}

foreach ($name in $apps) {
  $source = Join-Path $root "apps/$name/dist"
  if (-not (Test-Path $source)) {
    throw "缺少构建产物：$source（先运行 pnpm -r build）"
  }
  $destination = Join-Path $Target "public/app-next/$name"
  if (Test-Path $destination) {
    Remove-Item -Recurse -Force $destination
  }
  New-Item -ItemType Directory -Force $destination | Out-Null
  Copy-Item "$source/*" $destination -Recurse -Force

  $html = Get-Content (Join-Path $source 'index.html') -Raw
  $entry = [regex]::Match($html, 'src="([^"]+\.js)"').Groups[1].Value
  $css = [regex]::Matches($html, 'href="([^"]+\.css)"') | ForEach-Object { $_.Groups[1].Value }
  $manifestApps[$name] = [ordered]@{ entry = $entry; css = @($css) }
  Write-Host "published $name -> $destination"
}

$manifestPath = Join-Path $Target 'public/app-next/manifest.json'
$existing = @{}
if (Test-Path $manifestPath) {
  try { $existing = Get-Content $manifestPath -Raw | ConvertFrom-Json -AsHashtable } catch { $existing = @{} }
}
$merged = [ordered]@{
  frontendVersion = '0.1.0'
  contractVersion = 1
  builtAt         = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
  apps            = [ordered]@{}
  }
if ($existing.apps) {
  foreach ($key in $existing.apps.Keys) { $merged.apps[$key] = $existing.apps[$key] }
}
foreach ($key in $manifestApps.Keys) { $merged.apps[$key] = $manifestApps[$key] }
New-Item -ItemType Directory -Force (Split-Path $manifestPath) | Out-Null
$merged | ConvertTo-Json -Depth 6 | Set-Content $manifestPath -Encoding utf8
Write-Host "manifest -> $manifestPath"
