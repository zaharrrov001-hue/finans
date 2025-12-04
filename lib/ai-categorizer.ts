import { Category } from './types';

// Ключевые слова для автоматического определения категорий (без GPT)
const categoryKeywords: { [key: string]: string[] } = {
  // Расходы
  'Продукты': ['продукты', 'магазин', 'супермаркет', 'пятерочка', 'магнит', 'перекресток', 'ашан', 'лента', 'дикси', 'молоко', 'хлеб', 'мясо', 'овощи', 'фрукты', 'еда'],
  'Транспорт': ['бензин', 'топливо', 'газ', 'заправка', 'азс', 'лукойл', 'газпром', 'роснефть', 'такси', 'uber', 'яндекс', 'метро', 'автобус', 'парковка', 'мойка', 'шиномонтаж', 'сто', 'ремонт авто'],
  'Кафе и рестораны': ['кофе', 'coffee', 'кафе', 'ресторан', 'бар', 'пицца', 'суши', 'бургер', 'макдональдс', 'kfc', 'бургер кинг', 'старбакс', 'starbucks', 'обед', 'ужин', 'завтрак', 'ланч', 'доставка еды'],
  'Развлечения': ['кино', 'театр', 'концерт', 'музей', 'развлечения', 'игры', 'steam', 'playstation', 'xbox', 'netflix', 'spotify', 'подписка', 'билет'],
  'Здоровье': ['аптека', 'лекарства', 'врач', 'клиника', 'больница', 'анализы', 'стоматолог', 'медицина', 'витамины', 'таблетки'],
  'Покупки': ['одежда', 'обувь', 'zara', 'hm', 'uniqlo', 'nike', 'adidas', 'wildberries', 'ozon', 'aliexpress', 'amazon', 'техника', 'электроника', 'телефон', 'ноутбук', 'часы', 'очки', 'аксессуары', 'подарок', 'цветы'],
  'Связь': ['мобильный', 'интернет', 'связь', 'мтс', 'билайн', 'мегафон', 'теле2', 'ростелеком', 'wifi'],
  'ЖКХ': ['квартплата', 'жкх', 'электричество', 'свет', 'вода', 'газ', 'отопление', 'коммуналка'],
  'Образование': ['курсы', 'обучение', 'книги', 'учеба', 'школа', 'университет', 'репетитор'],
  // Бизнес расходы
  'Офис': ['офис', 'канцелярия', 'бумага', 'принтер', 'картридж'],
  'Реклама': ['реклама', 'маркетинг', 'продвижение', 'таргет', 'яндекс директ', 'google ads'],
  'Сотрудники': ['зарплата', 'премия', 'бонус', 'сотрудник'],
  'Налоги': ['налог', 'ндс', 'усн', 'патент', 'взносы', 'пфр', 'фсс'],
  // Доходы
  'Зарплата': ['зарплата', 'аванс', 'оклад', 'премия'],
  'Фриланс': ['фриланс', 'заказ', 'проект', 'клиент'],
  'Продажи': ['продажа', 'выручка', 'доход', 'оплата'],
  'Инвестиции': ['дивиденды', 'проценты', 'вклад', 'инвестиции', 'акции'],
};

// Функция для поиска категории по ключевым словам
export function findCategoryByKeywords(
  description: string, 
  categories: Category[]
): Category | null {
  const lowerDesc = description.toLowerCase();
  
  for (const [categoryName, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword.toLowerCase())) {
        // Ищем категорию с таким именем
        const found = categories.find(
          c => c.name.toLowerCase() === categoryName.toLowerCase()
        );
        if (found) return found;
      }
    }
  }
  
  return null;
}

// Интерфейс для результата категоризации
export interface CategorizedItem {
  description: string;
  amount: number;
  categoryId: string | null;
  categoryName: string | null;
}

// GPT категоризация
export async function categorizeWithGPT(
  items: { description: string; amount: number }[],
  categories: Category[],
  apiKey: string
): Promise<CategorizedItem[]> {
  if (!apiKey) {
    throw new Error('API ключ не указан');
  }

  const categoryList = categories.map(c => `"${c.name}" (${c.type})`).join(', ');
  
  const prompt = `Ты помощник для категоризации финансовых операций. 
Определи наиболее подходящую категорию для каждой операции.

Доступные категории: ${categoryList}

Операции для категоризации:
${items.map((item, i) => `${i + 1}. "${item.description}" - ${item.amount} руб`).join('\n')}

Верни JSON массив в формате:
[{"index": 0, "category": "Название категории"}, ...]

Если категория не определена, используй null.
Отвечай ТОЛЬКО JSON без пояснений.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Ты помощник для категоризации финансовых операций. Отвечай только JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Ошибка API');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '[]';
    
    // Парсим JSON ответ
    const parsed = JSON.parse(content);
    
    return items.map((item, index) => {
      const match = parsed.find((p: any) => p.index === index);
      const categoryName = match?.category || null;
      const category = categoryName 
        ? categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase())
        : null;
      
      return {
        description: item.description,
        amount: item.amount,
        categoryId: category?.id || null,
        categoryName: category?.name || categoryName,
      };
    });
  } catch (error) {
    console.error('GPT categorization error:', error);
    throw error;
  }
}

// Автоматическая категоризация (сначала GPT, потом ключевые слова)
export async function autoCategorize(
  items: { description: string; amount: number }[],
  categories: Category[],
  apiKey?: string
): Promise<CategorizedItem[]> {
  // Если есть API ключ, пробуем GPT
  if (apiKey) {
    try {
      return await categorizeWithGPT(items, categories, apiKey);
    } catch (error) {
      console.warn('GPT failed, falling back to keywords:', error);
    }
  }
  
  // Фоллбэк на ключевые слова
  return items.map(item => {
    const category = findCategoryByKeywords(item.description, categories);
    return {
      description: item.description,
      amount: item.amount,
      categoryId: category?.id || null,
      categoryName: category?.name || null,
    };
  });
}









