# Инструкция по деплою на Beget

## Подготовка

### 1. Требования
- Аккаунт на Beget с доступом к SSH
- Node.js 18+ на сервере Beget
- Git установлен на сервере

### 2. Подключение через SSH

```bash
ssh ваш_логин@ваш_домен.beget.tech
```

## Вариант 1: Автоматический деплой через Git (Рекомендуется)

### Шаг 1: Создайте директорию для приложения

```bash
cd ~
mkdir finance-app
cd finance-app
```

### Шаг 2: Клонируйте репозиторий

```bash
git clone https://github.com/zaharrrov001-hue/finans.git .
```

### Шаг 3: Установите зависимости

```bash
npm install
```

### Шаг 4: Создайте файл .env.production

```bash
nano .env.production
```

Добавьте (если нужно):
```
NODE_ENV=production
```

### Шаг 5: Соберите приложение

```bash
npm run build
```

### Шаг 6: Настройте запуск через PM2 (рекомендуется)

Установите PM2:
```bash
npm install -g pm2
```

Создайте файл `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'finance-app',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/home/ваш_логин/finance-app',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

Запустите:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Шаг 7: Настройте Nginx (через панель Beget)

1. Зайдите в панель Beget
2. Сайты → Ваш домен → Настройка
3. Добавьте проксирование:

```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Вариант 2: Через панель Beget (если доступен Git деплой)

1. Зайдите в панель Beget
2. Сайты → Создать сайт
3. Выберите "Node.js приложение"
4. Укажите:
   - Репозиторий: `https://github.com/zaharrrov001-hue/finans.git`
   - Ветка: `main`
   - Команда сборки: `npm install && npm run build`
   - Команда запуска: `npm start`
   - Порт: `3000`

## Обновление приложения

После изменений в GitHub:

```bash
cd ~/finance-app
git pull origin main
npm install
npm run build
pm2 restart finance-app
```

## Важные замечания

1. **Порт**: Beget может предоставить другой порт, проверьте в панели
2. **Домен**: Настройте домен в панели Beget
3. **SSL**: Включите SSL сертификат в панели
4. **Переменные окружения**: Добавьте через панель или файл .env.production

## Проверка работы

После деплоя проверьте:
- `https://ваш-домен.ru` - должен открываться сайт
- Логи: `pm2 logs finance-app`
- Статус: `pm2 status`


