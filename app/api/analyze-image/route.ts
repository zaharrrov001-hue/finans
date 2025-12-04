import { NextRequest, NextResponse } from 'next/server';

// v2.0 - Google Cloud Vision + OpenAI fallback
// Анализ через Google Cloud Vision
async function analyzeWithGoogleVision(imageBase64: string) {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) return null;

  try {
    // Убираем data:image prefix если есть
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64Data },
            features: [{ type: 'TEXT_DETECTION', maxResults: 50 }]
          }]
        })
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const text = data.responses?.[0]?.fullTextAnnotation?.text || '';
    return text;
  } catch (error) {
    console.error('Google Vision Error:', error);
    return null;
  }
}

// Парсинг текста (чеки + банковские приложения)
function parseReceiptText(text: string): { items: { name: string; amount: number }[]; total: number | null } {
  const items: { name: string; amount: number }[] = [];
  let total: number | null = null;
  
  console.log('OCR Text:', text.substring(0, 500));
  
  const lines = text.split('\n').filter(line => line.trim());
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Пропускаем служебные строки
    if (/^(дата|время|чек|кассир|терминал|адрес|телефон|спасибо|благодар|итого|баланс|доступно|счёт|карта \*|операци)/i.test(line.trim())) {
      continue;
    }
    
    // 1. Банковский формат: "Покупка МАГАЗИН" + "-500 ₽" или "- 500,00 ₽"
    const bankMatch = line.match(/[-−–]\s*(\d[\d\s]*[.,]?\d*)\s*[₽₴$€рР]/);
    if (bankMatch) {
      const amount = parseFloat(bankMatch[1].replace(/\s/g, '').replace(',', '.'));
      if (amount > 0) {
        // Ищем название в текущей или предыдущей строке
        let name = line.replace(/[-−–]\s*\d[\d\s.,]*\s*[₽₴$€рР]?/g, '').trim();
        if (name.length < 3 && i > 0) {
          name = lines[i-1].trim();
        }
        // Убираем "Покупка", "Перевод" и т.д.
        name = name.replace(/^(покупка|перевод|оплата|списание|пополнение)\s*/i, '').trim();
        if (name.length >= 2 && name.length <= 50) {
          items.push({ name: name.substring(0, 30), amount });
        }
      }
      continue;
    }
    
    // 2. Формат чека: "Товар 500" или "Товар 500.00 ₽"
    const receiptMatch = line.match(/^(.{2,40}?)\s+(\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{2})?)\s*[₽рР]?\s*$/);
    if (receiptMatch) {
      const name = receiptMatch[1].trim();
      const amount = parseFloat(receiptMatch[2].replace(/\s/g, '').replace(',', '.'));
      
      if (!/итого|всего|сумма|скидка|нал|карт|сдача|ндс|ндс/i.test(name) && amount > 0) {
        items.push({ name: name.substring(0, 30), amount });
      }
      continue;
    }
    
    // 3. Просто число с валютой (сумма)
    const simpleAmount = line.match(/(\d[\d\s]*[.,]\d{2})\s*[₽₴$€рР]/);
    if (simpleAmount && !items.find(it => it.amount === parseFloat(simpleAmount[1].replace(/\s/g, '').replace(',', '.')))) {
      const amount = parseFloat(simpleAmount[1].replace(/\s/g, '').replace(',', '.'));
      if (amount > 10 && amount < 1000000) {
        // Ищем название выше
        for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
          const prevLine = lines[j].trim();
          if (prevLine.length >= 3 && prevLine.length <= 40 && !/\d{2}[.,]\d{2}/.test(prevLine)) {
            items.push({ name: prevLine.substring(0, 30), amount });
            break;
          }
        }
      }
    }
    
    // 4. Ищем итого
    const totalMatch = line.match(/(?:итого|всего|total|к оплате)[:\s]*[₽$]?\s*(\d[\d\s.,]*)/i);
    if (totalMatch) {
      total = parseFloat(totalMatch[1].replace(/\s/g, '').replace(',', '.'));
    }
  }
  
  // Убираем дубликаты
  const unique = items.filter((item, index, self) => 
    index === self.findIndex(t => t.name === item.name && t.amount === item.amount)
  );
  
  return { items: unique, total };
}

// Анализ через OpenAI GPT-4 Vision
async function analyzeWithOpenAI(image: string, categoriesList: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
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
            content: `Ты анализируешь скриншоты банковских приложений и чеки.
Извлеки ВСЕ траты/покупки с суммами.

ВАЖНО: Ответ ТОЛЬКО JSON без пояснений:
{"items":[{"name":"название","amount":123}],"total":null}

Правила:
- name: краткое название (магазин, услуга, перевод кому)
- amount: сумма БЕЗ минуса, только число
- Игнорируй: баланс, доступно, кэшбэк, бонусы
- Если это чек - извлеки товары
- Если банк - извлеки операции расхода`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Найди все траты/покупки и их суммы:' },
              { type: 'image_url', image_url: { url: image, detail: 'high' } }
            ]
          }
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '{}';
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('OpenAI Vision Error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { image, categories } = await request.json();
    
    const categoriesList = categories?.map((c: { name: string; icon: string }) => 
      `${c.icon} ${c.name}`
    ).join(', ') || '';

    // 1. Сначала пробуем Google Cloud Vision (быстрее и дешевле)
    const googleText = await analyzeWithGoogleVision(image);
    if (googleText) {
      const parsed = parseReceiptText(googleText);
      if (parsed.items.length > 0 || parsed.total) {
        console.log('✓ Google Vision успешно');
        return NextResponse.json(parsed);
      }
    }

    // 2. Fallback на OpenAI GPT-4 Vision
    const openaiResult = await analyzeWithOpenAI(image, categoriesList);
    if (openaiResult && (openaiResult.items?.length > 0 || openaiResult.total)) {
      console.log('✓ OpenAI Vision успешно');
      return NextResponse.json(openaiResult);
    }

    // 3. Ничего не сработало
    return NextResponse.json({ 
      items: [], 
      total: null,
      error: 'Не удалось распознать. Добавьте API ключи в настройках Vercel.'
    });

  } catch (error) {
    console.error('Analyze Image API Error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера', items: [], total: null },
      { status: 500 }
    );
  }
}
