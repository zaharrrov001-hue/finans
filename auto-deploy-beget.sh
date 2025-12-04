#!/bin/bash

# Автоматический деплой finance-app на Beget
# Использование: ./auto-deploy-beget.sh

set -e

SERVER="45.80.69.195"
USER="root"
PASSWORD="2&UPny4fHa#P"
APP_DIR="/root/finance-app"

echo "🚀 Начинаю автоматический деплой на Beget..."

# Проверяем наличие sshpass (для автоматической передачи пароля)
if ! command -v sshpass &> /dev/null; then
    echo "📦 Установка sshpass..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if ! command -v brew &> /dev/null; then
            echo "❌ Требуется Homebrew. Установите: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            exit 1
        fi
        brew install hudochenkov/sshpass/sshpass
    else
        # Linux
        sudo apt-get update && sudo apt-get install -y sshpass || yum install -y sshpass
    fi
fi

# Функция для выполнения команд на сервере
run_remote() {
    sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$USER@$SERVER" "$@"
}

# Функция для загрузки файлов
upload_file() {
    sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$1" "$USER@$SERVER:$2"
}

echo "📡 Подключение к серверу..."

# Проверяем подключение
if ! run_remote "echo 'Подключение успешно!'" > /dev/null 2>&1; then
    echo "❌ Не удалось подключиться к серверу"
    exit 1
fi

echo "✅ Подключение установлено"

# Создаем директорию на сервере
echo "📁 Создание директории на сервере..."
run_remote "mkdir -p $APP_DIR"

# Загружаем файлы через Git (проще чем архив)
echo "📥 Клонирование репозитория..."
run_remote "cd /root && rm -rf finance-app && git clone https://github.com/zaharrrov001-hue/finans.git finance-app"

# Устанавливаем Node.js если нужно
echo "📦 Проверка Node.js..."
run_remote "command -v node >/dev/null 2>&1 || (curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs)"

# Устанавливаем зависимости
echo "📦 Установка зависимостей..."
run_remote "cd $APP_DIR && npm install"

# Собираем приложение
echo "🔨 Сборка приложения..."
run_remote "cd $APP_DIR && npm run build"

# Устанавливаем PM2
echo "📦 Установка PM2..."
run_remote "command -v pm2 >/dev/null 2>&1 || npm install -g pm2"

# Создаем директорию для логов
run_remote "mkdir -p $APP_DIR/logs"

# Запускаем приложение
echo "🚀 Запуск приложения..."
run_remote "cd $APP_DIR && pm2 delete finance-app 2>/dev/null || true"
run_remote "cd $APP_DIR && pm2 start ecosystem.config.js"
run_remote "pm2 save"
run_remote "pm2 startup systemd -u root --hp /root || true"

echo ""
echo "✅ Деплой завершён!"
echo ""
echo "📊 Статус приложения:"
run_remote "pm2 status"
echo ""
echo "🌐 Приложение доступно на: http://$SERVER:3000"
echo "📋 Настройте Nginx для проксирования на localhost:3000"

