#!/bin/bash

# Скрипт для настройки finance-app на Beget после загрузки архива

set -e

echo "🚀 Настройка finance-app на Beget..."

# Определяем где мы находимся
CURRENT_DIR=$(pwd)
echo "📁 Текущая директория: $CURRENT_DIR"

# Проверяем наличие архива
if [ -f "finance-app.tar.gz" ]; then
    echo "📦 Найден архив finance-app.tar.gz"
    ARCHIVE="finance-app.tar.gz"
elif [ -f "finance-app.tar" ]; then
    echo "📦 Найден архив finance-app.tar"
    ARCHIVE="finance-app.tar"
else
    echo "❌ Архив не найден! Убедитесь что вы в директории с архивом."
    exit 1
fi

# Распаковываем архив
echo "📂 Распаковка архива..."
if [ -d "finance-app" ]; then
    echo "⚠️  Папка finance-app уже существует. Удаляем старую..."
    rm -rf finance-app
fi

tar -xzf "$ARCHIVE"
cd finance-app

# Установка Node.js
if ! command -v node &> /dev/null; then
    echo "📦 Установка Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo "✅ Node.js уже установлен: $(node --version)"
fi

# Установка зависимостей
echo "📦 Установка зависимостей..."
npm install

# Сборка приложения
echo "🔨 Сборка приложения..."
npm run build

# Установка PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 Установка PM2..."
    npm install -g pm2
fi

# Создание директории для логов
mkdir -p logs

# Запуск через PM2
echo "🚀 Запуск приложения..."
pm2 delete finance-app 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# Настройка автозапуска
pm2 startup systemd -u root --hp /root || true

echo ""
echo "✅ Готово! Приложение запущено на порту 3000"
echo ""
echo "📊 Статус:"
pm2 status
echo ""
echo "📝 Полезные команды:"
echo "  pm2 logs finance-app    - просмотр логов"
echo "  pm2 restart finance-app - перезапуск"
echo "  pm2 stop finance-app   - остановка"
echo ""
echo "🌐 Настройте Nginx для проксирования на localhost:3000"

