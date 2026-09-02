param(
  [string[]]$Names = @(
    "OPENAI_API_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "SMTP_PASS",
    "BILLINGO_API_KEY"
  )
)

$ErrorActionPreference = "Stop"
$projectId = "ovexi-6ef38"
$allowedNames = @(
  "OPENAI_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "SMTP_PASS",
  "BILLINGO_API_KEY"
)

foreach ($name in $Names) {
  if ($name -notin $allowedNames) {
    throw "Ismeretlen titoknév: $name"
  }
  Write-Host "`n$name beállítása a Firebase Secret Managerben..." -ForegroundColor Cyan
  firebase functions:secrets:set $name --project $projectId
  if ($LASTEXITCODE -ne 0) {
    throw "$name mentése sikertelen."
  }
}

Write-Host "`nA megadott titkok biztonságosan elmentve." -ForegroundColor Green
