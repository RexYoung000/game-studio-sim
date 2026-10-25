#!/bin/sh
# 启动本地静态服务器并打开游戏（ES Modules 需要 HTTP 协议，见 tech-spec §1）
cd "$(dirname "$0")" || exit 1
PORT=8123
python3 -m http.server "$PORT" >/dev/null 2>&1 &
SERVER_PID=$!
sleep 1
open "http://localhost:$PORT/index.html"
echo "游戏已启动：http://localhost:$PORT/index.html"
echo "关闭本终端或按 Ctrl+C 结束服务器。"
wait $SERVER_PID
