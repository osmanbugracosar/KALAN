@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title Kalan - Windows kurulumu olustur

echo.
echo ============================================================
echo    KALAN - Windows kurulum dosyasi (.exe) olusturucu
echo ============================================================
echo.
echo Bu betik, Kalan uygulamasini bilgisayarinizda derleyip
echo kurulabilir bir .exe dosyasi uretir. GitHub gerekmez.
echo.
echo Devam etmeden once su 3 programin kurulu olmasi gerekir:
echo    1) Node.js          - https://nodejs.org  (LTS surumu)
echo    2) Rust             - https://rustup.rs
echo    3) C++ Build Tools  - "Visual Studio Build Tools"
echo       ("Desktop development with C++" secili olmali)
echo.
echo Bunlari bir kez kurmaniz yeterli. Ayrintili anlatim: KURULUM.txt
echo ------------------------------------------------------------
echo.
pause
echo.

echo [1/4] Gerekli programlar kontrol ediliyor...
echo.

set MISSING=0

where node >nul 2>nul
if errorlevel 1 (
  echo    [EKSIK] Node.js bulunamadi.  https://nodejs.org adresinden kurun.
  set MISSING=1
) else (
  for /f "delims=" %%v in ('node -v') do echo    [TAMAM] Node.js %%v
)

where npm >nul 2>nul
if errorlevel 1 (
  echo    [EKSIK] npm bulunamadi. Node.js kurulumu ile birlikte gelir.
  set MISSING=1
)

where cargo >nul 2>nul
if errorlevel 1 (
  echo    [EKSIK] Rust ^(cargo^) bulunamadi.  https://rustup.rs adresinden kurun.
  set MISSING=1
) else (
  for /f "delims=" %%v in ('cargo --version') do echo    [TAMAM] %%v
)

echo.
if "!MISSING!"=="1" (
  echo ------------------------------------------------------------
  echo  Yukarida [EKSIK] olarak isaretli programlari kurun,
  echo  bilgisayari yeniden baslatin ve bu dosyayi tekrar calistirin.
  echo ------------------------------------------------------------
  echo.
  pause
  exit /b 1
)

echo Tum programlar hazir.
echo.
echo [2/4] Paketler kuruluyor ^(npm install^)... Bu birkac dakika surebilir.
echo.
call npm install
if errorlevel 1 (
  echo.
  echo  HATA: Paketler kurulamadi. Internet baglantinizi kontrol edip tekrar deneyin.
  pause
  exit /b 1
)

echo.
echo [3/4] Uygulama derleniyor ^(npm run tauri:build^)...
echo       Ilk derleme 5-15 dakika surebilir, lutfen bekleyin.
echo.
call npm run tauri:build
if errorlevel 1 (
  echo.
  echo  HATA: Derleme basarisiz oldu.
  echo  En sik neden: "C++ Build Tools" veya "WebView2" eksik.
  echo  KURULUM.txt dosyasindaki "Sorun giderme" bolumune bakin.
  pause
  exit /b 1
)

echo.
echo [4/4] Tamamlandi! Kurulum dosyaniz hazir.
echo.
set OUTDIR=src-tauri\target\release\bundle
echo  Kurulum dosyalari su klasorde:
echo     %CD%\%OUTDIR%
echo.
echo  - nsis klasorundeki  "Kalan_1.0.0_x64-setup.exe"  -^> cift tiklayip kurun
echo  - msi  klasorundeki  ".msi"  dosyasi da kullanilabilir
echo.

if exist "%OUTDIR%\nsis" (
  echo Cikti klasoru aciliyor...
  start "" "%OUTDIR%\nsis"
) else if exist "%OUTDIR%" (
  start "" "%OUTDIR%"
)

echo.
pause
endlocal
