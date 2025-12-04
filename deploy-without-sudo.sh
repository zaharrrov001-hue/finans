#!/bin/bash
# Деплой без sudo прав - для обычного пользователя

set -e

echo "🚀 Начинаю деплой без sudo..."

# 1. Распаковка архива
echo "📂 Распаковка архива..."
cd ~
rm -rf finance-app
mkdir finance-app
cd finance-app
tar -xzf ~/ripromqi.beget.tech/public_html/finance-app.tar.gz

# 2. Установка nvm
echo "📦 Установка nvm..."
if [ ! -d "$HOME/.nvm" ]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
fi

# Загружаем nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 3. Установка Node.js
echo "📦 Установка Node.js 20..."
nvm install 20
nvm use 20
nvm alias default 20

# 4. Установка зависимостей
echo "📦 Установка зависимостей..."
npm install

# 5. Сборка приложения
echo "🔨 Сборка приложения..."
npm run build

# 6. Установка PM2 локально
echo "📦 Установка PM2..."
npm install -g pm2 --prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH

# Добавляем в .bashrc для постоянного использования
if ! grep -q "~/.npm-global/bin" ~/.bashrc; then
    echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
fi

# 7. Запуск приложения
echo "🚀 Запуск приложения..."
mkdir -p logs
pm2 delete finance-app 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# Настройка автозапуска (может не работать без sudo, но попробуем)
pm2 startup 2>/dev/null || echo "⚠️  Автозапуск PM2 требует sudo, но приложение запущено"

echo ""
echo "✅ Деплой завершён!"
echo "📊 Статус:"
pm2 status
echo ""
echo "🌐 Приложение доступно на порту 3000"
echo "📝 Для постоянного использования добавьте в ~/.bashrc:"
echo "   export PATH=~/.npm-global/bin:\$PATH"
echo "   export NVM_DIR=\"\$HOME/.nvm\""
echo "   [ -s \"\$NVM_DIR/nvm.sh\" ] && \. \"\$NVM_DIR/nvm.sh\""

