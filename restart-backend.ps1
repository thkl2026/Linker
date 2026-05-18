Write-Host "[Linker] 백엔드 재시작 중..."

# 기존 프로세스 종료
$procs = Get-WmiObject Win32_Process | Where-Object {
    $_.CommandLine -like "*LinkerApplication*" -or
    ($_.CommandLine -like "*bootRun*" -and $_.Name -eq "java.exe")
}
foreach ($p in $procs) {
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
    Write-Host "종료: PID $($p.ProcessId)"
}

Start-Sleep -Seconds 2

Write-Host "[Linker] 기동 시작..."
Start-Process `
    -FilePath "C:\Users\jayje\linker\backend\gradlew.bat" `
    -ArgumentList "bootRun" `
    -RedirectStandardOutput "C:\Users\jayje\linker\backend\bootrun.log" `
    -RedirectStandardError  "C:\Users\jayje\linker\backend\bootrun_err.log" `
    -WindowStyle Hidden `
    -WorkingDirectory "C:\Users\jayje\linker\backend"

Write-Host "[Linker] 백그라운드 기동 중."
Write-Host "[Linker] 로그: C:\Users\jayje\linker\backend\bootrun.log"
