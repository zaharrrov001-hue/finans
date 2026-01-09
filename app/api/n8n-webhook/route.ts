import { NextRequest, NextResponse } from 'next/server';

// Webhook endpoint для N8n
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Обработка данных от N8n
    console.log('Получены данные от N8n:', data);

    // Например, добавление транзакции из N8n
    if (data.action === 'add_transaction') {
      // Здесь можно сохранить в БД или вызвать другую логику
      return NextResponse.json({
        success: true,
        message: 'Транзакция добавлена',
        transaction: data.transaction
      });
    }

    // Получение статистики
    if (data.action === 'get_stats') {
      return NextResponse.json({
        success: true,
        stats: {
          balance: 50000,
          income: 100000,
          expense: 50000
        }
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Неизвестное действие'
    });

  } catch (error) {
    console.error('N8n Webhook Error:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

// Для GET запросов (проверка работоспособности)
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'N8n webhook endpoint работает'
  });
}
