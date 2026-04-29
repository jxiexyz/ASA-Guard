#!/bin/bash
cd ~/asa-guard/client
pkill -f "node server.js"; pkill -f "telegram-bot.js"; pkill -f "asa_bot"
sleep 1
nohup node server.js >> server.log 2>&1 &
nohup node telegram-bot.js >> telegram.log 2>&1 &
nohup python3 ~/asa-guard/asa_bot.py >> server.log 2>&1 &
echo "All started"
