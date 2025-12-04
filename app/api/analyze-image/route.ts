import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { image, categories } = await request.json();
    
    // Получаем API ключ из переменных окружения Vercel
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API ключ не настроен' },
        { status: 500 }
      );
    }

    const categoriesList = categories?.map((c: { name: string; icon: string; type: string }) => 
      `${c.icon} ${c.name}`
    ).join(', ') || '';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Ты анализируешь чеки и скриншоты покупок. Извлеки все товары/услуги и их цены.

ВАЖНО: Отвечай ТОЛЬКО в формате JSON:
{
  "items": [
    {"name": "название товара", "amount": 123, "category": "предложенная категория"}
  ],
  "total": 456
}

Доступные категории: ${categoriesList}

Правила:
- Названия товаров пиши кратко (1-3 слова)
- Цены только числа без копеек
- Если не можешь распознать - верни пустой массив items
- total - итоговая сумма если есть`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Проанализируй этот чек/скриншот и извлеки все покупки с ценами:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: image,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI Vision API Error:', error);
      return NextResponse.json(
        { error: 'Ошибка распознавания' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '{}';
    
    // Парсим JSON из ответа
    try {
      // Убираем markdown если есть
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      return NextResponse.json(parsed);
    } catch {
      console.error('Failed to parse GPT response:', content);
      return NextResponse.json({ items: [], total: null });
    }
  } catch (error) {
    console.error('Analyze Image API Error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
