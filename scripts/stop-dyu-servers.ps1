param([switch]$DryRun)

$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
$projectPrefix = $projectRoot + '\'

try {
    $processes = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -in @('node.exe', 'cmd.exe') })
} catch {
    Write-Error "Could not inspect running Node processes: $($_.Exception.Message)"
    exit 1
}

function Test-DyuNextProcess($process) {
    $command = ($process.CommandLine -replace '/', '\')
    if ($command.IndexOf($projectPrefix, [StringComparison]::OrdinalIgnoreCase) -lt 0) {
        return $false
    }

    return $command -match '(?i)\\next\\dist\\bin\\next["\s]+dev(?:\s|$)' -or
           $command -match '(?i)\\next\\dist\\server\\lib\\start-server\.js(?:["\s]|$)' -or
           $command -match '(?i)\\\.next\\dev\\build\\chunks\\pool_entry-'
}

$targets = @($processes | Where-Object { Test-DyuNextProcess $_ })

# Close old launcher terminals too. /c will close new ones automatically when
# their server exits; this also cleans up windows from earlier /k launchers.
$targets += @($processes | Where-Object {
    $_.Name -eq 'cmd.exe' -and
    $_.CommandLine.IndexOf($projectPrefix, [StringComparison]::OrdinalIgnoreCase) -ge 0 -and
    $_.CommandLine -match '(?i)cmd\.exe\s+/[ck]\s' -and
    $_.CommandLine -match 'title DYUhandmade - Frontend and Backend' -and
    $_.CommandLine -match 'npm\.cmd run dev'
})

# A production preview can use a relative script path. Only include one when
# its listening port serves this site's health endpoint and its owner is Next.
foreach ($port in @(3000, 3001, 3002, 3003, 3004, 3200)) {
    try {
        $listeners = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop)
    } catch {
        continue
    }

    foreach ($listener in $listeners) {
        $candidate = $processes | Where-Object ProcessId -EQ $listener.OwningProcess | Select-Object -First 1
        if (-not $candidate -or ($targets.ProcessId -contains $candidate.ProcessId)) { continue }
        if ($candidate.CommandLine -notmatch '(?i)node_modules[/\\]next[/\\]dist[/\\]bin[/\\]next\s+start(?:\s|$)') { continue }

        try {
            $health = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/health" -TimeoutSec 2
            if ($health.application -eq 'DYUhandmade') {
                $targets += $candidate
            }
        } catch {
            # A non-DYU service must never be stopped by the launcher.
        }
    }
}

if ($targets.Count -gt 0) {
    $ids = ($targets.ProcessId | Sort-Object -Unique) -join ', '
    Write-Host "[2/3] Closing existing DYU server processes: $ids"
}

if ($DryRun) { exit 0 }

foreach ($target in $targets) {
    # Check identity again before stopping: a PID can be reused after discovery.
    $current = Get-CimInstance Win32_Process -Filter "ProcessId = $($target.ProcessId)" -ErrorAction SilentlyContinue
    if (-not $current -or $current.CreationDate -ne $target.CreationDate -or $current.CommandLine -ne $target.CommandLine) {
        continue
    }
    try {
        Stop-Process -Id $target.ProcessId -Force -ErrorAction Stop
    } catch {
        Write-Error "Could not stop DYU process $($target.ProcessId): $($_.Exception.Message)"
        exit 1
    }
}

$deadline = (Get-Date).AddSeconds(20)
do {
    $remaining = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { Test-DyuNextProcess $_ })
    $portBusy = @(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue).Count -gt 0
    if ($remaining.Count -eq 0 -and -not $portBusy) { exit 0 }
    Start-Sleep -Milliseconds 300
} while ((Get-Date) -lt $deadline)

if ($portBusy) {
    Write-Error 'Port 3000 is still occupied. Close the application using it and try again.'
} else {
    Write-Error 'An existing DYU development server did not stop.'
}
exit 1
