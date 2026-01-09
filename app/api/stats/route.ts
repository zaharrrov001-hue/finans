import { NextRequest, NextResponse } from 'next/server';

// API для получения статистики
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const accountType = searchParams.get('accountType') || 'personal';
    const period = searchParams.get('period') || 'month'; // month, week, year

    // Mock данные статистики
    const stats = {
      period: period,
      accountType: accountType,
      balance: 45000,
      totalIncome: 100000,
      totalExpense: 55000,
      byCategory: [
        { categoryId: '6', categoryName: 'Продукты', total: 15000, icon: '🛒' },
        { categoryId: '7', categoryName: 'Транспорт', total: 8000, icon: '🚗' },
        { categoryId: '11', categoryName: 'Кафе и рестораны', total: 12000, icon: '🍽️' },
        { categoryId: '12', categoryName: 'Коммунальные услуги', total: 10000, icon: '🏠' },
        { categoryId: '15', categoryName: 'Другое', total: 10000, icon: '📦' }
      ],
      topExpenses: [
        { description: 'Продукты в Пятерочке', amount: 5000, date: new Date().toISOString() },
        { description: 'Заправка машины', amount: 3000, date: new Date().toISOString() },
        { description: 'Ресторан', amount: 4500, date: new Date().toISOString() }
      ],
      comparison: {
        previousPeriod: {
          income: 95000,
          expense: 50000,
          change: '+5%'
        }
      }
    };

    return NextResponse.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('Stats API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка получения статистики' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Кастомный запрос статистики с фильтрами
    const { startDate, endDate, accountType, categories } = body;

    const customStats = {
      startDate: startDate,
      endDate: endDate,
      accountType: accountType || 'personal',
      filteredCategories: categories || [],
      totalIncome: 100000,
      totalExpense: 55000,
      balance: 45000
    };

    return NextResponse.json({
      success: true,
      stats: customStats
    });

  } catch (error) {
    console.error('Custom Stats Error:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка получения статистики' },
      { status: 500 }
    );
  }
}
