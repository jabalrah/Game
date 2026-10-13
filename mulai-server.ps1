$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$origin = "https://jabalrah.github.io"
$log    = Join-Path $env:TEMP "cloudflared-game.log"
$logOut = Join-Path $env:TEMP "cloudflared-game-out.log"
Remove-Item $log, $logOut -ErrorAction SilentlyContinue

Write-Host "1/5 Mengambil update terbaru dari GitHub..."
git pull

if (-not (Test-Path (Join-Path $root "server\node_modules"))) {
    Write-Host "Pertama kali: memasang paket server (npm install)..."
    Push-Location (Join-Path $root "server")
    npm install
    Pop-Location
}

Write-Host "2/5 Menyalakan server game..."
$env:ALLOWED_ORIGINS = $origin
$srv = Start-Process cmd -ArgumentList "/k", "npm start" `
        -WorkingDirectory (Join-Path $root "server") -PassThru

Write-Host "3/5 Menyalakan tunnel Cloudflare..."
$tun = Start-Process cloudflared `
        -ArgumentList "tunnel", "--url", "http://localhost:3000" `
        -RedirectStandardError $log -RedirectStandardOutput $logOut `
        -WindowStyle Hidden -PassThru

Write-Host "4/5 Menunggu alamat tunnel (maks 60 detik)..."
$url = $null
for ($i = 0; $i -lt 60 -and -not $url; $i++) {
    Start-Sleep -Seconds 1
    $txt = Get-Content $log -Raw -ErrorAction SilentlyContinue
    if ($txt) {
        foreach ($m in [regex]::Matches($txt, 'https://[a-z0-9-]+\.trycloudflare\.com')) {
            if ($m.Value -ne "https://api.trycloudflare.com") { $url = $m.Value; break }
        }
    }
}

if (-not $url) {
    Write-Host "GAGAL: alamat tunnel tidak ditemukan. Cek koneksi internet lalu coba lagi."
    Stop-Process -Id $tun.Id -ErrorAction SilentlyContinue
    taskkill /PID $srv.Id /T /F | Out-Null
    Read-Host "Tekan Enter untuk menutup"
    exit 1
}

$wss = $url -replace '^https://', 'wss://'
Write-Host "Alamat server: $wss"

Write-Host "5/5 Memperbarui game.js dan mengirim ke GitHub..."
$file = Join-Path $root "game.js"
$old  = [IO.File]::ReadAllText($file)
$new  = [regex]::Replace($old, 'serverUrl:\s*"[^"]*"', ('serverUrl: "' + $wss + '"'))
if ($new -ne $old) {
    [IO.File]::WriteAllText($file, $new, (New-Object Text.UTF8Encoding($false)))
    git add game.js
    git commit -m "Update alamat server"
    git push
} else {
    Write-Host "Alamat sama seperti sebelumnya, tidak perlu dikirim."
}

Write-Host ""
Write-Host "SELESAI. Tunggu 1-2 menit sampai GitHub Pages selesai deploy,"
Write-Host "lalu buka https://jabalrah.github.io/Game/ dengan Ctrl+F5."
Write-Host ""
Read-Host "Server aktif. Tekan Enter di sini untuk MENGHENTIKAN server dan tunnel"

Stop-Process -Id $tun.Id -ErrorAction SilentlyContinue
taskkill /PID $srv.Id /T /F | Out-Null
Write-Host "Server dihentikan."
