Write-Host "Starting Artemis..." -ForegroundColor Cyan

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\krish\OneDrive\Desktop\Artemis\k8s-operator'; python k8s_operator.py"

Write-Host "Operator started" -ForegroundColor Green

$pgJob = Start-Job -ScriptBlock { minikube service artemis-postgres-svc --url }
$redisJob = Start-Job -ScriptBlock { minikube service artemis-redis-svc --url }
$grafanaJob = Start-Job -ScriptBlock { minikube service artemis-grafana-svc --url }

Write-Host "Waiting for tunnels..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

$pgUrl = Receive-Job $pgJob | Where-Object { $_ -match "http://127.0.0.1" } | Select-Object -Last 1
$redisUrl = Receive-Job $redisJob | Where-Object { $_ -match "http://127.0.0.1" } | Select-Object -Last 1
$grafanaUrl = Receive-Job $grafanaJob | Where-Object { $_ -match "http://127.0.0.1" } | Select-Object -Last 1

if (-not $pgUrl -or -not $redisUrl) {
    Write-Host "Failed to get tunnel URLs. Check if minikube is running." -ForegroundColor Red
    exit 1
}

$pgPort = ([System.Uri]$pgUrl.Trim()).Port
$redisPort = ([System.Uri]$redisUrl.Trim()).Port
$grafanaPort = if ($grafanaUrl) { ([System.Uri]$grafanaUrl.Trim()).Port } else { 3000 }

Write-Host "Postgres: $pgPort" -ForegroundColor Green
Write-Host "Redis: $redisPort" -ForegroundColor Green
Write-Host "Grafana: $grafanaPort" -ForegroundColor Green

$envContent = "PG_PORT=$pgPort`nREDIS_PORT=$redisPort`nGRAFANA_PORT=$grafanaPort`nNEXT_PUBLIC_GRAFANA_PORT=$grafanaPort"
Set-Content -Path "C:\Users\krish\OneDrive\Desktop\Artemis\k8s-ui\.env.local" -Value $envContent

Write-Host "Updated .env.local" -ForegroundColor Green
Write-Host "Starting Next.js..." -ForegroundColor Cyan

cd C:\Users\krish\OneDrive\Desktop\Artemis\k8s-ui
npm run dev