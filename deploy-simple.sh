#!/bin/bash

# Простой скрипт деплоя - выполняется БЕЗ пароля после настройки SSH ключа
# Использование: ./deploy-simple.sh

SERVER="45.80.69.195"
USER="root"

echo "🚀 Начинаю деплой на Beget..."

ssh $USER@$SERVER << 'ENDSSH'
set -e

APP_DIR="/root/finance-app"

echo "📁 Создание директории..."
mkdir -p $APP_DIR
cd /root

echo "📥 Клонирование репозитория..."
rm -rf finance-app
git clone https://github.com/zaharrrov001-hue/finans.git finance-app
cd finance-app

echo "📦 Установка Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

echo "📦 Установка зависимостей..."
npm install

echo "🔨 Сборка приложения..."
npm run build

echo "📦 Установка PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

echo "🚀 Запуск приложения..."
mkdir -p logs
pm2 delete finance-app 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root || true

echo ""
echo "✅ Деплой завершён!"
echo "📊 Статус:"
pm2 status
ENDSSH

echo ""
echo "🌐 Приложение доступно на: http://$SERVER:3000"

