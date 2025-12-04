import { NextRequest, NextResponse } from 'next/server';

// Умный парсинг текста от Google Vision для банковских приложений
function parseReceiptText(text: string): { items: { name: string; amount: number }[]; total: number | null } {
  const items: { name: string; amount: number }[] = [];
  let total: number | null = null;
  
  console.log('OCR Text:', text.substring(0, 1000));
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Паттерны для пропуска
  const skipPatterns = [
    /^(операции|расходы|доходы|баланс|доступно|счёт|карта|фильтр|без перев|декабрь|ноябрь|октябрь|сентябрь|август|июль|июнь|май|апрель|март|февраль|январь)/i,
    /^(вчера|сегодня|завтра)/i,
    /^\d{1,2}\s+(декабря|ноября|октября|сентября|августа|июля|июня|мая|апреля|марта|февраля|января)/i,
    /^(пн|вт|ср|чт|пт|сб|вс)$/i,
    /^[0-9]{1,2}:[0-9]{2}$/, // время
    /^\+?\s*фильтр/i,
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Пропускаем заголовки и служебные строки
    if (skipPatterns.some(p => p.test(line))) {
      continue;
    }
    
    // Пропускаем строки только с числами (даты, суммы без названия)
    if (/^[\d\s.,]+$/.test(line) && line.length < 20) {
      continue;
    }
    
    // 1. Банковский формат: "Название" + "Категория" + "- 230 P" или "+1000 P"
    // Ищем сумму в конце строки: "- 123 P", "+ 456 P", "- 2 733,31 P"
    const amountMatch = line.match(/([+-])\s*(\d[\d\s]*[.,]?\d*)\s*[₽₴$€рРP]/);
    if (amountMatch) {
      const sign = amountMatch[1];
      const amountStr = amountMatch[2].replace(/\s/g, '').replace(',', '.');
      const amount = parseFloat(amountStr);
      
      if (amount > 0 && amount < 10000000) {
        // Убираем сумму из строки, получаем название
        let name = line.replace(/([+-])\s*\d[\d\s.,]*\s*[₽₴$€рРP].*$/, '').trim();
        
        // Если название короткое, смотрим предыдущие строки
        if (name.length < 3 && i > 0) {
          // Проверяем предыдущую строку
          const prevLine = lines[i - 1].trim();
          if (prevLine.length >= 3 && prevLine.length <= 60 && !skipPatterns.some(p => p.test(prevLine))) {
            // Если предыдущая строка не содержит сумму, это название
            if (!/([+-])\s*\d[\d\s.,]*\s*[₽₴$€рРP]/.test(prevLine)) {
              name = prevLine;
            }
          }
        }
        
        // Убираем категории из названия (Переводы, Фастфуд, Пополнения и т.д.)
        name = name.replace(/\s*(переводы|фастфуд|пополнения|финансовые услуги|еда|транспорт|развлечения|покупки|услуги)$/i, '').trim();
        
        // Убираем лишние слова
        name = name.replace(/^(покупка|перевод|оплата|списание|пополнение|возврат)\s*/i, '').trim();
        
        // Если название валидное
        if (name.length >= 2 && name.length <= 50) {
          // Берем только расходы (минус) или все если указано
          if (sign === '-' || sign === '+') {
            items.push({ 
              name: name.substring(0, 40), 
              amount: sign === '-' ? amount : amount 
            });
          }
        }
      }
      continue;
    }
    
    // 2. Формат чека: "Товар 500" или "Товар 500.00 ₽"
    const receiptMatch = line.match(/^(.{2,50}?)\s+(\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{2})?)\s*[₽рР]?\s*$/);
    if (receiptMatch) {
      const name = receiptMatch[1].trim();
      const amount = parseFloat(receiptMatch[2].replace(/\s/g, '').replace(',', '.'));
      
      if (!/итого|всего|сумма|скидка|нал|карт|сдача|ндс/i.test(name) && amount > 0 && amount < 1000000) {
        items.push({ name: name.substring(0, 40), amount });
      }
      continue;
    }
    
    // 3. Ищем итого/баланс
    const totalMatch = line.match(/(?:итого|всего|total|к оплате|баланс)[:\s]*[₽$]?\s*(\d[\d\s.,]*)/i);
    if (totalMatch) {
      total = parseFloat(totalMatch[1].replace(/\s/g, '').replace(',', '.'));
    }
  }
  
  // Убираем дубликаты и сортируем по сумме (большие суммы первыми)
  const unique = items
    .filter((item, index, self) => 
      index === self.findIndex(t => 
        Math.abs(t.amount - item.amount) < 0.01 && 
        t.name.toLowerCase() === item.name.toLowerCase()
      )
    )
    .sort((a, b) => b.amount - a.amount);
  
  return { items: unique, total };
}


export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Текст не предоставлен', items: [], total: null },
        { status: 400 }
      );
    }

    // Парсим текст
    const parsed = parseReceiptText(text);
    
    if (parsed.items.length > 0 || parsed.total) {
      console.log(`✓ Распознано: ${parsed.items.length} операций`);
      return NextResponse.json(parsed);
    }

    return NextResponse.json({ 
      items: [], 
      total: null,
      error: 'Не удалось найти операции в тексте'
    });

  } catch (error) {
    console.error('Parse Text API Error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера', items: [], total: null },
      { status: 500 }
    );
  }
}
