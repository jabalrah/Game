$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

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

function Port-Terpakai($port) {
    $c = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    return [bool]$c
}

if (Port-Terpakai 3000) {
    Write-Host "Port 3000 sudah dipakai. Tutup server game yang masih jalan, lalu coba lagi."
    Read-Host "Tekan Enter untuk menutup"
    exit 1
}
if (Port-Terpakai 8000) {
    Write-Host "Port 8000 sudah dipakai. Tutup server web yang masih jalan, lalu coba lagi."
    Read-Host "Tekan Enter untuk menutup"
    exit 1
}

Buat-DaftarKarakter

# Tanpa batasan alamat, supaya localhost diterima oleh server game
Remove-Item Env:\ALLOWED_ORIGINS -ErrorAction SilentlyContinue

if (-not (Test-Path (Join-Path $root "server\node_modules"))) {
    Write-Host "Pertama kali: memasang paket server (npm install)..."
    Push-Location (Join-Path $root "server")
    npm install
    Pop-Location
}

Write-Host "1/3 Menyalakan server game (port 3000)..."
$srv = Start-Process cmd -ArgumentList "/k", "npm start" `
        -WorkingDirectory (Join-Path $root "server") -PassThru

Write-Host "2/3 Menyalakan server web (port 8000)..."
$web = Start-Process cmd -ArgumentList "/k", "npx --yes http-server -p 8000 -c-1" `
        -WorkingDirectory $root -PassThru

Write-Host "3/3 Menunggu server web siap (pertama kali bisa agak lama)..."
$siap = $false
for ($i = 0; $i -lt 60 -and -not $siap; $i++) {
    Start-Sleep -Seconds 1
    $siap = Port-Terpakai 8000
}

if ($siap) {
    Start-Process "http://localhost:8000"
    Write-Host ""
    Write-Host "Game dibuka di http://localhost:8000"
    Write-Host "Untuk tes dua pemain, buka satu lagi di jendela Incognito dengan nama berbeda."
    Write-Host "Setelah mengubah file, tekan Ctrl+F5 di browser."
} else {
    Write-Host "Server web belum siap setelah 60 detik. Lihat jendela server web untuk pesan error."
}

Write-Host ""
Read-Host "Tekan Enter di sini untuk MENGHENTIKAN semua server"

taskkill /PID $srv.Id /T /F | Out-Null
taskkill /PID $web.Id /T /F | Out-Null
Write-Host "Semua server dihentikan."
