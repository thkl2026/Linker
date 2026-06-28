$env:JAVA_HOME = "C:\Users\jayje\.antigravity-ide\extensions\redhat.java-1.55.0-win32-x64\jre\21.0.11-win32-x86_64"
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

# .env 파일 로드 (존재하는 경우)
$envFile = Join-Path $PSScriptRoot ".env"
if (Test-Path $envFile) {
    Write-Host "[Linker] .env 파일 로드 중..."
    Get-Content $envFile | Where-Object { $_ -match '=' -and $_ -notmatch '^#' } | ForEach-Object {
        $name, $value = $_.Split('=', 2)
        $name = $name.Trim()
        $value = $value.Trim()
        # 따옴표 제거
        if ($value.StartsWith('"') -and $value.EndsWith('"')) { $value = $value.Substring(1, $value.Length - 2) }
        if ($value.StartsWith("'") -and $value.EndsWith("'")) { $value = $value.Substring(1, $value.Length - 2) }
        [System.Environment]::SetEnvironmentVariable($name, $value, [System.EnvironmentVariableTarget]::Process)
    }
}

# GEMINI_API_KEY 검증 및 설정
$geminiKey = $env:GEMINI_API_KEY
if ([string]::IsNullOrEmpty($geminiKey)) {
    $geminiKey = [System.Environment]::GetEnvironmentVariable('GEMINI_API_KEY', 'User')
}
if ([string]::IsNullOrEmpty($geminiKey)) {
    $geminiKey = [System.Environment]::GetEnvironmentVariable('GEMINI_API_KEY', 'Machine')
}

if ([string]::IsNullOrEmpty($geminiKey)) {
    Write-Warning "[Linker] GEMINI_API_KEY가 환경 변수나 .env 파일에 설정되어 있지 않습니다. AI 분석 기능이 실패할 수 있습니다."
} else {
    Write-Host "[Linker] GEMINI_API_KEY 감지됨."
    $env:GEMINI_API_KEY = $geminiKey
}

Write-Host "[Linker] 기동 시작..."
$backendDir = Join-Path $PSScriptRoot "backend"
$gradlew = Join-Path $backendDir "gradlew.bat"
$logFile = Join-Path $backendDir "bootrun.log"
$errFile = Join-Path $backendDir "bootrun_err.log"

Start-Process `
    -FilePath "$gradlew" `
    -ArgumentList "bootRun" `
    -RedirectStandardOutput $logFile `
    -RedirectStandardError  $errFile `
    -WindowStyle Hidden `
    -WorkingDirectory $backendDir

Write-Host "[Linker] 백그라운드 기동 중."
Write-Host "[Linker] 로그: $logFile"
