$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
$srvDir = Join-Path $root "server"

function Berhenti($pesan) {
    Write-Host ""
    Write-Host ("GAGAL: " + $pesan) -ForegroundColor Red
    Write-Host ""
    Read-Host "Tekan Enter untuk menutup"
    exit 1
}
function Ada($nama) { return [bool](Get-Command $nama -ErrorAction SilentlyContinue) }
function Port-Terpakai($port) {
    $c = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    return [bool]$c
}
function Buat-DaftarKarakter {
    # Membuat assets\body\daftar.json (daftar nama folder karakter) sebagai cadangan
    # untuk game di GitHub Pages bila pembacaan folder lewat API GitHub gagal.
    $dir = Join-Path $root "assets\body"
    if (-not (Test-Path $dir)) { return }
    $names = @(Get-ChildItem $dir -Directory | Sort-Object Name | ForEach-Object { $_.Name })
    $json = ConvertTo-Json -InputObject $names -Compress
    [IO.File]::WriteAllText((Join-Path $dir "daftar.json"), $json, (New-Object Text.UTF8Encoding($false)))
    Write-Host ("Daftar karakter: " + ($names -join ", "))
}

$origin = "https://jabalrah.github.io"
$log    = Join-Path $env:TEMP "cloudflared-game.log"
$logOut = Join-Path $env:TEMP "cloudflared-game-out.log"
Remove-Item $log, $logOut -ErrorAction SilentlyContinue

Write-Host "0/5 Memeriksa program yang dibutuhkan..."
if (-not (Ada "node")) { Berhenti "Node.js belum terpasang. Pasang dari https://nodejs.org (pilih LTS), lalu jalankan file ini lagi." }
if (-not (Ada "npm"))  { Berhenti "npm tidak ditemukan. Pasang ulang Node.js dari https://nodejs.org (pilih LTS)." }

$cfd = $null
$cmdCf = Get-Command cloudflared -ErrorAction SilentlyContinue
if ($cmdCf) { $cfd = $cmdCf.Source }
if (-not $cfd) {
    foreach ($p in @(
        "$env:ProgramFiles\cloudflared\cloudflared.exe",
        "${env:ProgramFiles(x86)}\cloudflared\cloudflared.exe",
        "$env:LOCALAPPDATA\Microsoft\WinGet\Links\cloudflared.exe")) {
        if ($p -and (Test-Path $p)) { $cfd = $p; break }
    }
}
if (-not $cfd) { Berhenti "cloudflared belum terpasang. Buka PowerShell lalu ketik: winget install --id Cloudflare.cloudflared  (setelah itu tutup dan buka lagi file ini)." }

if (Port-Terpakai 3000) {
    Berhenti "Port 3000 sudah dipakai (kemungkinan server game sebelumnya masih jalan). Tutup jendela server yang lama, lalu coba lagi."
}

$punyaGit = Ada "git"
Write-Host "1/5 Mengambil update terbaru dari GitHub..."
if ($punyaGit) {
    git pull --no-rebase --no-edit
    if ($LASTEXITCODE -ne 0) {
        Write-Host "PERINGATAN: git pull gagal (lihat pesan di atas). Server tetap dijalankan dengan file yang ada." -ForegroundColor Yellow
    }
} else {
    Write-Host "PERINGATAN: Git tidak ditemukan, langkah ambil/kirim ke GitHub dilewati." -ForegroundColor Yellow
}

# Pasang paket kalau belum ada ATAU kalau ada paket baru di package.json (misalnya pngjs)
$perluInstall = (-not (Test-Path (Join-Path $srvDir "node_modules\ws"))) -or (-not (Test-Path (Join-Path $srvDir "node_modules\pngjs")))
if ($perluInstall) {
    Write-Host "Memasang paket server (npm install)..."
    Push-Location $srvDir
    npm install
    $kodeNpm = $LASTEXITCODE
    Pop-Location
    if ($kodeNpm -ne 0) { Berhenti "npm install gagal (lihat pesan di atas). Cek koneksi internet lalu coba lagi." }
}

Write-Host "2/5 Menyalakan server game..."
$env:ALLOWED_ORIGINS = $origin
$srv = Start-Process cmd -ArgumentList "/k", "npm start" -WorkingDirectory $srvDir -PassThru

$naik = $false
for ($i = 0; $i -lt 20 -and -not $naik; $i++) {
    Start-Sleep -Seconds 1
    $naik = Port-Terpakai 3000
}
if (-not $naik) {
    taskkill /PID $srv.Id /T /F | Out-Null
    Berhenti "Server game tidak bisa menyala. Lihat pesan error di jendela server yang tadi terbuka."
}

Write-Host "3/5 Menyalakan tunnel Cloudflare..."
$tun = Start-Process $cfd `
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
    Stop-Process -Id $tun.Id -ErrorAction SilentlyContinue
    taskkill /PID $srv.Id /T /F | Out-Null
    Berhenti "Alamat tunnel tidak ditemukan. Cek koneksi internet lalu coba lagi. (Log: $log)"
}

$wss = $url -replace '^https://', 'wss://'
Write-Host "Alamat server: $wss"

Write-Host "5/5 Memperbarui game.js dan daftar karakter, lalu mengirim ke GitHub..."
Buat-DaftarKarakter
$file = Join-Path $root "game.js"
$old  = [IO.File]::ReadAllText($file)
$new  = [regex]::Replace($old, 'serverUrl:\s*"[^"]*"', ('serverUrl: "' + $wss + '"'))
if ($new -ne $old) {
    [IO.File]::WriteAllText($file, $new, (New-Object Text.UTF8Encoding($false)))
}
if ($punyaGit) {
    git add game.js assets/body/daftar.json
    git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
        git commit -m "Update alamat server dan daftar karakter"
        git push
        if ($LASTEXITCODE -ne 0) {
            Write-Host "PERINGATAN: git push GAGAL. Game online belum memakai alamat server baru." -ForegroundColor Yellow
            Write-Host "Coba: git pull --no-rebase --no-edit  lalu  git push  (atau jalankan file ini lagi)." -ForegroundColor Yellow
        }
    } else {
        Write-Host "Tidak ada perubahan yang perlu dikirim."
    }
}

Write-Host ""
Write-Host "SELESAI. Tunggu 1-2 menit sampai GitHub Pages selesai deploy,"
Write-Host "lalu buka https://jabalrah.github.io/Game/ dengan Ctrl+F5."
Write-Host ""
Read-Host "Server aktif. Tekan Enter di sini untuk MENGHENTIKAN server dan tunnel"

Stop-Process -Id $tun.Id -ErrorAction SilentlyContinue
taskkill /PID $srv.Id /T /F | Out-Null
Write-Host "Server dihentikan."
