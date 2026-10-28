#!/bin/bash
echo "========================================================"
echo " フリップ大喜利 システム 起動スクリプト (Mac / Linux用)"
echo "========================================================"
echo ""

if ! command -v node &> /dev/null; then
    echo "【エラー】Node.js がインストールされていません。"
    echo "https://nodejs.org/ から Node.js (LTS推奨) をインストールしてください。"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "[1/2] 初回起動のため、必要なパッケージを自動インストールしています..."
    npm install
    if [ $? -ne 0 ]; then
        echo "パッケージのインストールに失敗しました。ネット接続を確認してください。"
        exit 1
    fi
    echo "パッケージの準備が完了しました！"
    echo ""
fi

echo "[2/2] ローカルサーバーを起動しています (http://localhost:3000)..."
if command -v open &> /dev/null; then
    (sleep 2 && open http://localhost:3000) &
elif command -v xdg-open &> /dev/null; then
    (sleep 2 && xdg-open http://localhost:3000) &
fi

npm run dev
