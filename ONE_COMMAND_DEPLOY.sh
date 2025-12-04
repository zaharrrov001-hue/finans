#!/bin/bash
# ОДНА команда для выполнения в веб-терминале Beget
# Скопируйте всю команду ниже и вставьте в терминал

cd /root && rm -rf finance-app && git clone https://github.com/zaharrrov001-hue/finans.git finance-app && cd finance-app && (command -v node >/dev/null 2>&1 || (curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs)) && npm install && npm run build && (command -v pm2 >/dev/null 2>&1 || npm install -g pm2) && mkdir -p logs && pm2 delete finance-app 2>/dev/null || true && pm2 start ecosystem.config.js && pm2 save && pm2 startup systemd -u root --hp /root || true && echo "✅ Готово!" && pm2 status

