import { NextRequest, NextResponse } from 'next/server';

// Функция очистки текста суммы от ошибок OCR
function cleanAmountStr(str: string): string {
  return str
    .replace(/[oOО]/g, '0')
    .replace(/[lI|]/g, '1')
    .replace(/[zZЗз]/g, '3')
    .replace(/[bб]/g, '6')
    .replace(/[sS]/g, '5')
    .replace(/\s+/g, '') // Убираем пробелы
    .replace(/,/g, '.'); // Запятую на точку
}

// Умный парсинг текста (для Tesseract)
function parseReceiptText(text: string): { items: { name: string; amount: number }[]; total: number | null } {
  const items: { name: string; amount: number }[] = [];
  let total: number | null = null;
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  const skipPatterns = [
    /^(операции|расходы|доходы|баланс|доступно|счёт|карта|фильтр|без перев|декабрь|ноябрь|октябрь|сентябрь|август|июль|июнь|май|апрель|март|февраль|январь)/i,
    /^(вчера|сегодня|завтра)/i,
    /^\d{1,2}\s+(декабря|ноября|октября|сентября|августа|июля|июня|мая|апреля|марта|февраля|января)/i,
    /^(пн|вт|ср|чт|пт|сб|вс)$/i,
    /^[0-9]{1,2}:[0-9]{2}$/, 
    /^\+?\s*фильтр/i,
    /^(\d{1,2}.\d{1,2}.\d{2,4})$/ 
  ];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (skipPatterns.some(p => p.test(line))) continue;
    if (/^[\d\s.,]+$/.test(line) && line.length < 5) continue;

    const amountRegex = /([+\-−–]?)\s*([\d\sOoОоlI|zZЗзbбsS.,]+)\s*([₽PРpRr$€]|руб|rub)/i;
    const match = line.match(amountRegex);

    if (match) {
      const cleanAmt = cleanAmountStr(match[2]);
      const amount = parseFloat(cleanAmt);

      if (isNaN(amount) || amount <= 0 || amount > 10000000) continue;

      let name = line.substring(0, match.index).trim();
      if (name.length < 3 && i > 0) {
        const prevLine = lines[i - 1].trim();
        if (!skipPatterns.some(p => p.test(prevLine)) && !amountRegex.test(prevLine)) {
           name = prevLine;
        }
      }

      name = name
        .replace(/^(покупка|перевод|оплата|списание|пополнение|возврат|от|кому|куда)\s*/i, '')
        .replace(/\s*(переводы|фастфуд|супермаркеты|транспорт|развлечения|финансовые услуги|красота|аптеки|рестораны|другое)$/i, '')
        .replace(/[>»›]/g, '')
        .trim();

      if (name.length > 2) {
        items.push({ name: name.substring(0, 40), amount });
        continue;
      }
    }
    
    if (/(итого|всего|total|оплате)/i.test(line)) {
       const totalMatch = line.match(/([\d\sOoОоlI|.,]+)/);
       if (totalMatch) {
         const val = parseFloat(cleanAmountStr(totalMatch[1]));
         if (!isNaN(val)) total = val;
       }
    }
  }
  
  const uniqueItems = items.filter((v,i,a)=>a.findIndex(t=>(t.name===v.name && t.amount===v.amount))===i);
  return { items: uniqueItems, total };
}

// Анализ через Mistral (Pixtral)
async function analyzeWithMistral(image: string) {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'pixtral-12b-2409',
        messages: [
          {
            role: 'user',
            content: [
              { 
                type: 'text', 
                text: `Проанализируй это изображение (чек или скриншот банка). 
Верни ТОЛЬКО JSON в формате:
{"items": [{"name": "название товара/услуги", "amount": 100}], "total": 1000}
Игнорируй даты, баланс и мусор. Названия должны быть краткими.` 
              },
              { type: 'image_url', image_url: image }
            ]
          }
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '{}';
    
    // Пытаемся извлечь JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error('Mistral Error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { text, image } = await request.json();
    
    // 1. Если есть текст от Tesseract - пробуем распарсить его
    if (text && typeof text === 'string') {
        const parsed = parseReceiptText(text);
        if (parsed.items.length > 0 || parsed.total) {
            console.log(`✓ Tesseract распознал: ${parsed.items.length} позиций`);
            return NextResponse.json(parsed);
        }
    }

    // 2. Если Tesseract не справился, но есть картинка - пробуем Mistral
    if (image && typeof image === 'string') {
        console.log('Tesseract не справился, пробую Mistral...');
        const mistralResult = await analyzeWithMistral(image);
        if (mistralResult && (mistralResult.items?.length > 0 || mistralResult.total)) {
            console.log(`✓ Mistral распознал: ${mistralResult.items.length} позиций`);
            return NextResponse.json(mistralResult);
        }
    }

    return NextResponse.json({ 
      items: [], 
      total: null,
      error: 'Не удалось распознать данные'
    });

  } catch (error) {
    console.error('Analyze API Error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера', items: [], total: null },
      { status: 500 }
    );
  }
}
