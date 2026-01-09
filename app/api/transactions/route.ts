import { NextRequest, NextResponse } from 'next/server';

// API для работы с транзакциями
// GET - получить все транзакции
// POST - добавить новую транзакцию

export async function GET(request: NextRequest) {
  try {
    // В реальном приложении здесь будет чтение из БД
    // Пока возвращаем mock данные

    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '10';
    const type = searchParams.get('type'); // income / expense

    const mockTransactions = [
      {
        id: '1',
        amount: 5000,
        description: 'Продукты в Пятерочке',
        categoryId: '6',
        type: 'expense',
        accountType: 'personal',
        date: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        amount: 50000,
        description: 'Зарплата',
        categoryId: '1',
        type: 'income',
        accountType: 'personal',
        date: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    ];

    let filtered = mockTransactions;
    if (type) {
      filtered = filtered.filter(t => t.type === type);
    }

    return NextResponse.json({
      success: true,
      transactions: filtered.slice(0, parseInt(limit)),
      total: filtered.length
    });

  } catch (error) {
    console.error('GET Transactions Error:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка получения транзакций' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Валидация
    if (!body.amount || !body.description || !body.categoryId || !body.type) {
      return NextResponse.json(
        { success: false, error: 'Не все обязательные поля заполнены' },
        { status: 400 }
      );
    }

    // В реальном приложении здесь будет сохранение в БД
    const newTransaction = {
      id: Date.now().toString(),
      amount: body.amount,
      description: body.description,
      categoryId: body.categoryId,
      type: body.type,
      accountType: body.accountType || 'personal',
      date: body.date || new Date().toISOString(),
      attachments: body.attachments || [],
      createdAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      message: 'Транзакция добавлена',
      transaction: newTransaction
    });

  } catch (error) {
    console.error('POST Transaction Error:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка добавления транзакции' },
      { status: 500 }
    );
  }
}
