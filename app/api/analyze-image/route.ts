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

// Умный парсинг текста от Google Vision для банковских приложений
function parseReceiptText(text: string): { items: { name: string; amount: number }[]; total: number | null } {
  const items: { name: string; amount: number }[] = [];
  let total: number | null = null;
  
  // Чистим базовый текст для логов
  const cleanLogText = text.replace(/\n/g, ' ').substring(0, 200);
  console.log('Parsing text:', cleanLogText);
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Паттерны для пропуска (мусор)
  const skipPatterns = [
    /^(операции|расходы|доходы|баланс|доступно|счёт|карта|фильтр|без перев|декабрь|ноябрь|октябрь|сентябрь|август|июль|июнь|май|апрель|март|февраль|январь)/i,
    /^(вчера|сегодня|завтра)/i,
    /^\d{1,2}\s+(декабря|ноября|октября|сентября|августа|июля|июня|мая|апреля|марта|февраля|января)/i,
    /^(пн|вт|ср|чт|пт|сб|вс)$/i,
    /^[0-9]{1,2}:[0-9]{2}$/, 
    /^\+?\s*фильтр/i,
    /^(\d{1,2}.\d{1,2}.\d{2,4})$/ // Даты типа 01.01.2024
  ];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Пропускаем очевидный мусор
    if (skipPatterns.some(p => p.test(line))) continue;
    if (/^[\d\s.,]+$/.test(line) && line.length < 5) continue; // Короткие числа

    // --- Попытка найти сумму с валютой ---
    // Ищем паттерны вида: "- 123 P", "+ 123.00", "123 Р"
    // Учитываем ошибки OCR: P, Р, R, p, rub, руб
    const amountRegex = /([+\-−–]?)\s*([\d\sOoОоlI|zZЗзbбsS.,]+)\s*([₽PРpRr$€]|руб|rub)/i;
    const match = line.match(amountRegex);

    if (match) {
      const sign = match[1]; // + или - (может быть пустым)
      const rawAmount = match[2];
      
      // Чистим сумму
      let cleanAmt = cleanAmountStr(rawAmount);
      
      // Пытаемся восстановить дробную часть если она "прилипла" или отделилась криво
      // Если последние 2 цифры отделены точкой - ок. Если нет, смотрим на длину.
      // Часто OCR выдает "12345" вместо "123.45". Банковские суммы часто с копейками.
      // Но рискованно просто делить на 100. Оставим как есть, если нет явной точки.
      
      const amount = parseFloat(cleanAmt);

      // Фильтр неадекватных чисел
      if (isNaN(amount) || amount <= 0 || amount > 10000000) continue;

      // --- Поиск названия ---
      // Название обычно СЛЕВА от суммы в той же строке или ВЫШЕ
      let name = line.substring(0, match.index).trim();
      
      // Если в текущей строке названия почти нет, берем предыдущую
      if (name.length < 3 && i > 0) {
        const prevLine = lines[i - 1].trim();
        // Проверяем, что предыдущая строка не является датой или мусором
        if (!skipPatterns.some(p => p.test(prevLine)) && !amountRegex.test(prevLine)) {
           name = prevLine;
        }
      }

      // Чистка названия
      name = name
        .replace(/^(покупка|перевод|оплата|списание|пополнение|возврат|от|кому|куда)\s*/i, '') // Убираем тип операции
        .replace(/\s*(переводы|фастфуд|супермаркеты|транспорт|развлечения|финансовые услуги|красота|аптеки|рестораны|другое)$/i, '') // Убираем категорию в конце (часто в банках)
        .replace(/[>»›]/g, '') // Мусор OCR
        .trim();

      if (name.length > 2) {
        // Определяем знак операции для записи
        // Если есть явный плюс - это доход. Если слова "пополнение", "возврат", "входящий" - доход.
        // По умолчанию считаем расходом, если нет плюса.
        
        const isIncome = sign.includes('+') || /пополн|возврат|входящ/i.test(lines[i] + (i>0?lines[i-1]:''));
        
        // Формируем результат. Для расходов сумма без минуса (логика приложения сама разберется или мы явно укажем?)
        // В input диалога мы пишем просто "продукты 500". Если это доход, надо писать иначе?
        // Сейчас диалог парсит всё как расход по умолчанию, если не переключен таб.
        // Но мы можем добавить слово "доход" или "плюс" в название, но это костыль.
        // Лучше просто вернуть item. 
        
        items.push({ 
          name: name.substring(0, 40), 
          amount: amount 
        });
        continue; // Нашли сумму в этой строке, идем дальше
      }
    }
    
    // 3. Поиск "Итого"
    if (/(итого|всего|total|оплате)/i.test(line)) {
       const totalMatch = line.match(/([\d\sOoОоlI|.,]+)/);
       if (totalMatch) {
         const val = parseFloat(cleanAmountStr(totalMatch[1]));
         if (!isNaN(val)) total = val;
       }
    }
  }
  
  // Убираем дубликаты (иногда одна операция сканируется дважды)
  const uniqueItems = items.filter((v,i,a)=>a.findIndex(t=>(t.name===v.name && t.amount===v.amount))===i);

  return { items: uniqueItems, total };
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
