# 📋 Команды для выполнения в веб-терминале Beget

## Просто скопируйте и вставьте эти команды в веб-терминал Beget:

```bash
cd /root && rm -rf finance-app && git clone https://github.com/zaharrrov001-hue/finans.git finance-app && cd finance-app && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs && npm install && npm run build && npm install -g pm2 && mkdir -p logs && pm2 delete finance-app 2>/dev/null || true && pm2 start ecosystem.config.js && pm2 save && pm2 startup systemd -u root --hp /root || true && pm2 status
```

## Или по шагам (если одна команда не работает):

```bash
# 1. Переходим в корень и клонируем репозиторий
cd /root
rm -rf finance-app
git clone https://github.com/zaharrrov001-hue/finans.git finance-app
cd finance-app

# 2. Устанавливаем Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 3. Устанавливаем зависимости
npm install

# 4. Собираем приложение
npm run build

# 5. Устанавливаем PM2
npm install -g pm2

# 6. Создаем директорию для логов
mkdir -p logs

# 7. Запускаем приложение
pm2 delete finance-app 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root || true

# 8. Проверяем статус
pm2 status
```

## После выполнения:

✅ Приложение будет доступно на: `http://45.80.69.195:3000`

📋 Настройте Nginx в панели Beget для проксирования на `localhost:3000`

