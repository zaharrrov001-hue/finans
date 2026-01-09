# 🔧 Гайд по созданию N8n Workflow

## 📋 Доступные API Endpoints

### 1. **Транзакции**
```
GET  /api/transactions?limit=10&type=expense
POST /api/transactions
```

### 2. **Статистика**
```
GET  /api/stats?accountType=personal&period=month
POST /api/stats
```

### 3. **Категории**
```
GET /api/categories?type=expense&accountType=personal
```

### 4. **N8n Webhook** (универсальный)
```
GET  /api/n8n-webhook
POST /api/n8n-webhook
```

---

## 🚀 Workflow 1: Telegram Bot - Статистика по запросу

### Описание
Пользователь пишет боту "статистика" и получает текущие данные

### Структура
```
[Telegram Trigger]
    ↓
[HTTP Request] → GET /api/stats
    ↓
[Function] → Форматирование ответа
    ↓
[Telegram] → Отправка сообщения
```

### Настройка

#### 1. Telegram Trigger
```
Node: Telegram Trigger
Updates: message
Trigger On: message

В @BotFather:
/newbot → создать бота
/token → получить токен

Credentials:
Access Token: ваш_токен_от_BotFather
```

#### 2. HTTP Request
```
Node: HTTP Request
Method: GET
URL: http://localhost:3000/api/stats?accountType=personal&period=month
```

#### 3. Function Node (форматирование)
```javascript
const stats = $input.item.json.stats;

const message = `
📊 *Статистика за месяц*

💰 Баланс: ${stats.balance.toLocaleString('ru-RU')} ₽
📈 Доходы: ${stats.totalIncome.toLocaleString('ru-RU')} ₽
📉 Расходы: ${stats.totalExpense.toLocaleString('ru-RU')} ₽

*Топ категорий расходов:*
${stats.byCategory.map((cat, i) =>
  `${i+1}. ${cat.icon} ${cat.categoryName}: ${cat.total.toLocaleString('ru-RU')} ₽`
).join('\n')}
`;

return { message };
```

#### 4. Telegram Send Message
```
Node: Telegram
Operation: Send Message
Chat ID: {{ $('Telegram Trigger').item.json.message.chat.id }}
Text: {{ $json.message }}
Parse Mode: Markdown
```

---

## 🚀 Workflow 2: Добавление транзакции через Telegram

### Структура
```
[Telegram Trigger]
    ↓
[IF] → Проверка команды /add
    ↓
[Code] → Парсинг текста
    ↓
[HTTP Request] → POST /api/transactions
    ↓
[Telegram] → Подтверждение
```

### Настройка

#### 1. IF Node
```
Condition: Contains
Value 1: {{ $json.message.text }}
Value 2: /add
```

#### 2. Code Node (парсинг)
```javascript
const text = $input.item.json.message.text;

// Формат: /add 500 Кофе
const parts = text.split(' ');
const amount = parseInt(parts[1]);
const description = parts.slice(2).join(' ');

return {
  amount: amount,
  description: description,
  categoryId: '15', // Другое
  type: 'expense',
  accountType: 'personal'
};
```

#### 3. HTTP Request
```
Method: POST
URL: http://localhost:3000/api/transactions
Body:
{
  "amount": {{ $json.amount }},
  "description": "{{ $json.description }}",
  "categoryId": "{{ $json.categoryId }}",
  "type": "{{ $json.type }}",
  "accountType": "{{ $json.accountType }}"
}
```

---

## 🚀 Workflow 3: Ежедневный отчёт по расписанию

### Структура
```
[Schedule Trigger] → Каждый день в 9:00
    ↓
[HTTP Request] → GET /api/stats
    ↓
[HTTP Request] → GET /api/transactions?limit=5
    ↓
[Function] → Объединение данных
    ↓
[Telegram] → Отправка отчёта
```

### Настройка

#### 1. Schedule Trigger
```
Node: Schedule Trigger
Trigger Times: Cron
Cron Expression: 0 9 * * *
(каждый день в 9:00)
```

#### 2. Function (объединение)
```javascript
const stats = $('HTTP Request').item.json.stats;
const transactions = $('HTTP Request1').item.json.transactions;

const report = `
🌅 *Доброе утро! Ваш финансовый отчёт*

💰 Текущий баланс: ${stats.balance.toLocaleString('ru-RU')} ₽

📝 *Последние операции:*
${transactions.map(t =>
  `${t.type === 'expense' ? '📉' : '📈'} ${t.description}: ${t.amount} ₽`
).join('\n')}

Хорошего дня! 🎯
`;

return {
  chatId: 'ВАШ_CHAT_ID', // Укажите свой ID
  message: report
};
```

---

## 🚀 Workflow 4: Webhook для внешних сервисов

### Описание
Принимает данные от других сервисов (Zapier, IFTTT, etc.)

### Структура
```
[Webhook Trigger]
    ↓
[Switch] → Выбор действия
    ├─ add_transaction → HTTP POST /api/transactions
    ├─ get_stats → HTTP GET /api/stats
    └─ get_categories → HTTP GET /api/categories
```

### Настройка

#### 1. Webhook Trigger
```
Node: Webhook
HTTP Method: POST
Path: /webhook/finance

URL будет: http://localhost:5678/webhook/finance
```

#### 2. Switch Node
```
Mode: Rules
Rules:
- {{ $json.body.action }} = "add_transaction" → Output 1
- {{ $json.body.action }} = "get_stats" → Output 2
- {{ $json.body.action }} = "get_categories" → Output 3
```

#### 3. Тестовый запрос
```bash
curl -X POST http://localhost:5678/webhook/finance \
  -H "Content-Type: application/json" \
  -d '{
    "action": "add_transaction",
    "data": {
      "amount": 1000,
      "description": "Тест",
      "categoryId": "15",
      "type": "expense"
    }
  }'
```

---

## 🎯 Быстрый старт

### 1. Запустите проекты
```bash
# Терминал 1
cd /home/user/finans
npm run dev

# Терминал 2
npx n8n
```

### 2. Импортируйте готовый workflow

Создайте новый workflow в N8n и скопируйте этот JSON:

```json
{
  "name": "Finance Telegram Bot",
  "nodes": [
    {
      "name": "Telegram Trigger",
      "type": "n8n-nodes-base.telegramTrigger",
      "position": [250, 300]
    },
    {
      "name": "HTTP Request",
      "type": "n8n-nodes-base.httpRequest",
      "position": [450, 300],
      "parameters": {
        "url": "http://localhost:3000/api/stats",
        "method": "GET"
      }
    },
    {
      "name": "Telegram",
      "type": "n8n-nodes-base.telegram",
      "position": [650, 300],
      "parameters": {
        "chatId": "={{ $('Telegram Trigger').item.json.message.chat.id }}",
        "text": "Баланс: {{ $json.stats.balance }} ₽"
      }
    }
  ],
  "connections": {
    "Telegram Trigger": {
      "main": [[{ "node": "HTTP Request", "type": "main", "index": 0 }]]
    },
    "HTTP Request": {
      "main": [[{ "node": "Telegram", "type": "main", "index": 0 }]]
    }
  }
}
```

### 3. Протестируйте
1. Отправьте любое сообщение вашему Telegram боту
2. Должен прийти ответ со статистикой

---

## 📚 Полезные выражения N8n

```javascript
// Получить данные из предыдущей ноды
{{ $json.field }}

// Форматировать число
{{ $json.amount.toLocaleString('ru-RU') }}

// Текущая дата
{{ new Date().toISOString() }}

// Условие
{{ $json.amount > 1000 ? 'Дорого' : 'Дёшево' }}

// Получить из конкретной ноды
{{ $('HTTP Request').item.json.stats.balance }}
```

---

## 🔐 Production Checklist

- [ ] Замените localhost на реальный домен
- [ ] Добавьте авторизацию (Bearer token)
- [ ] Настройте HTTPS
- [ ] Ограничьте rate limiting
- [ ] Добавьте логирование
- [ ] Настройте мониторинг

---

Нужна помощь с настройкой конкретного workflow? Спрашивайте!
