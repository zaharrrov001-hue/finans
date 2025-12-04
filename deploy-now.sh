#!/bin/bash

# Автоматический деплой finance-app на Beget
# Использование: ./deploy-now.sh

SERVER="45.80.69.195"
USER="root"
PASSWORD="2&UPny4fHa#P"

echo "🚀 Начинаю автоматический деплой..."

# Создаем временный скрипт для выполнения на сервере
cat > /tmp/deploy-remote.sh << 'REMOTE_SCRIPT'
#!/bin/bash
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

echo "✅ Деплой завершён!"
pm2 status
REMOTE_SCRIPT

# Загружаем скрипт на сервер и выполняем
echo "📤 Загрузка скрипта на сервер..."
expect << EOF
set timeout 600
spawn scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null /tmp/deploy-remote.sh $USER@$SERVER:/tmp/deploy-remote.sh
expect "password:"
send "$PASSWORD\r"
expect eof
EOF

echo "▶️  Выполнение деплоя на сервере..."
expect << EOF
set timeout 600
spawn ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $USER@$SERVER "bash /tmp/deploy-remote.sh"
expect {
    "password:" {
        send "$PASSWORD\r"
        exp_continue
    }
    eof
}
EOF

# Удаляем временный файл
rm -f /tmp/deploy-remote.sh

echo ""
echo "✅ Деплой завершён!"
echo "🌐 Приложение доступно на: http://$SERVER:3000"

