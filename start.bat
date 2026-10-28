@echo off
chcp 65001 > nul
echo ========================================================
echo  フリップ大喜利 システム 起動スクリプト (Windows用)
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo 【エラー】Node.js がインストールされていません。
    echo 以下の公式サイトから Node.js (LTS推奨) をインストールしてください:
    echo https://nodejs.org/
    echo.
    echo インストール後、このファイルをもう一度ダブルクリックしてください。
    pause
    exit /b 1
)

if not exist node_modules (
    echo [1/2] 初回起動のため、必要なパッケージを自動インストールしています...
    echo (インターネット環境が必要です。1〜2分程度お待ちください)
    call npm install
    if %errorlevel% neq 0 (
        echo パッケージのインストールに失敗しました。ネット接続を確認してください。
        pause
        exit /b 1
    )
    echo パッケージの準備が完了しました！
    echo.
)

echo [2/2] ローカルサーバーを起動しています...
echo ブラウザで http://localhost:3000 を開きます。
echo.
timeout /t 2 >nul
start http://localhost:3000
call npm run dev
