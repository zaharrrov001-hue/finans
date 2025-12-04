import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { messages, transactions, categories } = await request.json();
    
    // Получаем API ключ из переменных окружения Vercel
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API ключ не настроен на сервере' },
        { status: 500 }
      );
    }

    // Подготавливаем контекст с данными пользователя
    const transactionsSummary = transactions?.slice(0, 50).map((t: { 
      description: string; 
      amount: number; 
      type: string; 
      date: string;
      categoryId?: string;
    }) => {
      const category = categories?.find((c: { id: string; name: string }) => c.id === t.categoryId);
      return `${t.date}: ${t.type === 'income' ? '+' : '-'}${t.amount}₽ - ${t.description} (${category?.name || 'без категории'})`;
    }).join('\n') || 'Нет транзакций';

    const categoriesList = categories?.map((c: { name: string; icon: string; type: string }) => 
      `${c.icon} ${c.name} (${c.type === 'income' ? 'доход' : 'расход'})`
    ).join(', ') || 'Нет категорий';

    const systemPrompt = `Ты - финансовый ассистент. Отвечай на русском языке кратко и по делу.

Данные пользователя:
- Категории: ${categoriesList}
- Последние транзакции:
${transactionsSummary}

Ты можешь:
1. Анализировать расходы и доходы
2. Отвечать на вопросы о финансах
3. Давать рекомендации по бюджету
4. Добавлять новые категории (отвечай в формате: [ADD_CATEGORY:название:иконка:тип])

Будь дружелюбным и полезным!`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API Error:', error);
      return NextResponse.json(
        { error: 'Ошибка API OpenAI' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || 'Нет ответа';

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
