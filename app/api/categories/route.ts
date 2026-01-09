import { NextRequest, NextResponse } from 'next/server';

// API для работы с категориями
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // income / expense
    const accountType = searchParams.get('accountType'); // personal / business

    // Mock категории
    const allCategories = [
      // Доходы
      { id: '1', name: 'Зарплата', icon: '💼', color: '#22c55e', type: 'income', accountType: 'both' },
      { id: '2', name: 'Фриланс', icon: '💻', color: '#10b981', type: 'income', accountType: 'both' },
      { id: '3', name: 'Инвестиции', icon: '📈', color: '#14b8a6', type: 'income', accountType: 'both' },
      { id: 'b1', name: 'Продажи', icon: '🛍️', color: '#22c55e', type: 'income', accountType: 'business' },

      // Расходы
      { id: '6', name: 'Продукты', icon: '🛒', color: '#f97316', type: 'expense', accountType: 'personal' },
      { id: '7', name: 'Транспорт', icon: '🚗', color: '#ef4444', type: 'expense', accountType: 'both' },
      { id: '8', name: 'Развлечения', icon: '🎬', color: '#ec4899', type: 'expense', accountType: 'personal' },
      { id: '11', name: 'Кафе и рестораны', icon: '🍽️', color: '#a855f7', type: 'expense', accountType: 'personal' },
      { id: '12', name: 'Коммунальные услуги', icon: '🏠', color: '#8b5cf6', type: 'expense', accountType: 'personal' },
      { id: 'b4', name: 'Аренда офиса', icon: '🏢', color: '#f97316', type: 'expense', accountType: 'business' },
      { id: 'b6', name: 'Реклама', icon: '📢', color: '#ec4899', type: 'expense', accountType: 'business' },
    ];

    let filtered = allCategories;

    if (type) {
      filtered = filtered.filter(c => c.type === type);
    }

    if (accountType) {
      filtered = filtered.filter(c =>
        c.accountType === accountType || c.accountType === 'both'
      );
    }

    return NextResponse.json({
      success: true,
      categories: filtered,
      total: filtered.length
    });

  } catch (error) {
    console.error('Categories API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка получения категорий' },
      { status: 500 }
    );
  }
}
