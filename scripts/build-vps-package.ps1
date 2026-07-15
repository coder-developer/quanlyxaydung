param(
  [string]$Output = "release/Quan-Tri-Doanh-Nghiep-VPS-1.1.0.zip"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$target = [System.IO.Path]::GetFullPath((Join-Path $root $Output))
$targetDir = Split-Path -Parent $target
New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

Push-Location $root
try {
  if (Test-Path $target) { Remove-Item -LiteralPath $target -Force }
  git archive --format=zip --output="$target" HEAD
  if ($LASTEXITCODE -ne 0) { throw "Không thể tạo gói VPS từ Git." }
  $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $target).Hash.ToLowerInvariant()
  Set-Content -LiteralPath "$target.sha256" -Value "$hash  $([System.IO.Path]::GetFileName($target))" -Encoding ascii
  Write-Output $target
  Write-Output "SHA256: $hash"
} finally {
  Pop-Location
}
