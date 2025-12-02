'use client';

import { useMemo } from 'react';
import { useFinanceStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Wallet, PieChart, Briefcase, User } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import { AccountType } from '@/lib/types';

export function Dashboard() {
  const { transactions, categories, getStats, currentAccountType, setAccountType } = useFinanceStore();
  
  const currentMonthStats = useMemo(() => {
    const now = new Date();
    return getStats(startOfMonth(now), endOfMonth(now), currentAccountType);
  }, [transactions, getStats, currentAccountType]);
  
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => t.accountType === currentAccountType);
  }, [transactions, currentAccountType]);
  
  const topExpenseCategories = useMemo(() => {
    return currentMonthStats.byCategory
      .filter((item) => {
        const cat = categories.find((c) => c.id === item.categoryId);
        return cat?.type === 'expense';
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [currentMonthStats, categories]);
  
  const maxExpense = Math.max(...topExpenseCategories.map((c) => c.total), 1);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Заголовок с переключателем */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Обзор финансов
          </h1>
          <p className="text-sm text-zinc-500">
            {format(new Date(), 'LLLL yyyy', { locale: ru })}
          </p>
        </div>
        
        {/* Переключатель Личное/Бизнес */}
        <Tabs 
          value={currentAccountType} 
          onValueChange={(v) => setAccountType(v as AccountType)}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid w-full sm:w-auto grid-cols-2 h-10">
            <TabsTrigger value="personal" className="gap-2 px-4">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Личное</span>
            </TabsTrigger>
            <TabsTrigger value="business" className="gap-2 px-4">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Бизнес</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Основные карточки */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Баланс - красивый градиент */}
        <Card className="bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 text-white border-0 shadow-xl shadow-blue-500/25">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white/80">
              Баланс
            </CardTitle>
            <div className="p-1.5 bg-white/20 rounded-lg">
              <Wallet className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              {formatCurrency(currentMonthStats.balance)}
            </div>
            <p className="text-xs text-white/70 mt-1">
              {currentAccountType === 'personal' ? '👤 Личный счёт' : '💼 Бизнес счёт'}
            </p>
          </CardContent>
        </Card>

        {/* Доходы */}
        <Card className="border-zinc-200/50 shadow-sm bg-white/80 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-600">
              Доходы
            </CardTitle>
            <div className="p-2 bg-emerald-50 rounded-full">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              +{formatCurrency(currentMonthStats.totalIncome)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {filteredTransactions.filter(t => t.type === 'income').length} операций
            </p>
          </CardContent>
        </Card>

        {/* Расходы */}
        <Card className="border-zinc-200/50 shadow-sm bg-white/80 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-600">
              Расходы
            </CardTitle>
            <div className="p-2 bg-rose-50 rounded-full">
              <TrendingDown className="h-4 w-4 text-rose-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              -{formatCurrency(currentMonthStats.totalExpense)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {filteredTransactions.filter(t => t.type === 'expense').length} операций
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Топ категорий расходов */}
      <Card className="border-zinc-200/50 shadow-sm bg-white/80 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium text-zinc-800">
            Топ расходов по категориям
          </CardTitle>
          <PieChart className="h-4 w-4 text-zinc-400" />
        </CardHeader>
        <CardContent className="space-y-4">
          {topExpenseCategories.length > 0 ? (
            topExpenseCategories.map((item) => {
              const category = categories.find((c) => c.id === item.categoryId);
              if (!category) return null;
              
              const percentage = (item.total / maxExpense) * 100;
              
              return (
                <div key={item.categoryId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{category.icon}</span>
                      <span className="text-sm font-medium text-zinc-700">
                        {category.name}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-zinc-900">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                  <Progress 
                    value={percentage} 
                    className="h-2 bg-zinc-100"
                    style={{ 
                      ['--progress-background' as string]: category.color 
                    }}
                  />
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-zinc-500">
              <PieChart className="h-12 w-12 mx-auto mb-3 text-zinc-300" />
              <p className="text-sm">Пока нет расходов</p>
              <p className="text-xs text-zinc-400">Добавьте первую транзакцию</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}





