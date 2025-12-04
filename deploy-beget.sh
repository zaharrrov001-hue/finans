#!/bin/bash

# Скрипт для деплоя finance-app на Beget
# Использование: скопируйте этот скрипт на сервер и выполните

set -e

echo "🚀 Начало деплоя finance-app на Beget..."

# 1. Обновление системы
echo "📦 Обновление системы..."
yum update -y || apt-get update -y

# 2. Установка Node.js 20 (если не установлен)
if ! command -v node &> /dev/null; then
    echo "📦 Установка Node.js 20..."
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    yum install -y nodejs || apt-get install -y nodejs
fi

echo "✅ Node.js версия: $(node --version)"
echo "✅ npm версия: $(npm --version)"

# 3. Установка PM2 (если не установлен)
if ! command -v pm2 &> /dev/null; then
    echo "📦 Установка PM2..."
    npm install -g pm2
fi

# 4. Создание директории для приложения
APP_DIR="/root/finance-app"
echo "📁 Создание директории: $APP_DIR"
mkdir -p $APP_DIR
cd $APP_DIR

# 5. Клонирование или обновление репозитория
if [ -d ".git" ]; then
    echo "🔄 Обновление репозитория..."
    git pull origin main
else
    echo "📥 Клонирование репозитория..."
    git clone https://github.com/zaharrrov001-hue/finans.git .
fi

# 6. Установка зависимостей
echo "📦 Установка зависимостей..."
npm install --production

# 7. Сборка приложения
echo "🔨 Сборка приложения..."
npm run build

# 8. Создание директории для логов
mkdir -p logs

# 9. Запуск через PM2
echo "🚀 Запуск приложения через PM2..."
pm2 delete finance-app 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# 10. Настройка автозапуска PM2
pm2 startup systemd -u root --hp /root || true

echo ""
echo "✅ Деплой завершён!"
echo ""
echo "📊 Статус приложения:"
pm2 status
echo ""
echo "📝 Логи: pm2 logs finance-app"
echo "🔄 Перезапуск: pm2 restart finance-app"
echo "⏹️  Остановка: pm2 stop finance-app"
echo ""
echo "🌐 Приложение запущено на порту 3000"
echo "📋 Настройте Nginx для проксирования на localhost:3000"


