#!/bin/bash

# Простой скрипт деплоя - копирует команды для выполнения на сервере

echo "📋 Скопируйте и выполните эти команды в веб-терминале Beget:"
echo ""
echo "=========================================="
cat << 'EOF'
cd /root
rm -rf finance-app
git clone https://github.com/zaharrrov001-hue/finans.git finance-app
cd finance-app

# Установка Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Установка зависимостей
npm install

# Сборка
npm run build

# Установка PM2
npm install -g pm2

# Запуск
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root || true

# Проверка
pm2 status
EOF
echo "=========================================="
echo ""
echo "Или запустите автоматический скрипт:"
echo "  ./auto-deploy-beget.sh"
echo ""
echo "Но сначала установите sshpass:"
echo "  brew install hudochenkov/sshpass/sshpass"

