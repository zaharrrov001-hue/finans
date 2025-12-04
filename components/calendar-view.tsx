'use client';

import { useState, useMemo } from 'react';
import { useFinanceStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday
} from 'date-fns';
import { ru } from 'date-fns/locale';

interface CalendarViewProps {
  onDateSelect?: (date: Date) => void;
}

export function CalendarView({ onDateSelect }: CalendarViewProps) {
  const { transactions, categories, currentAccountType } = useFinanceStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Фильтруем транзакции по типу счёта
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => t.accountType === currentAccountType);
  }, [transactions, currentAccountType]);

  // Получаем дни для отображения
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Получаем суммы по дням
  const dayTotals = useMemo(() => {
    const totals: Record<string, { income: number; expense: number; transactions: typeof filteredTransactions }> = {};
    
    filteredTransactions.forEach(t => {
      const dateKey = format(new Date(t.date), 'yyyy-MM-dd');
      if (!totals[dateKey]) {
        totals[dateKey] = { income: 0, expense: 0, transactions: [] };
      }
      if (t.type === 'income') {
        totals[dateKey].income += t.amount;
      } else {
        totals[dateKey].expense += t.amount;
      }
      totals[dateKey].transactions.push(t);
    });
    
    return totals;
  }, [filteredTransactions]);

  // Транзакции выбранного дня
  const selectedDayTransactions = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return dayTotals[dateKey]?.transactions || [];
  }, [selectedDate, dayTotals]);

  // Статистика месяца
  const monthStats = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    return filteredTransactions
      .filter(t => {
        const date = new Date(t.date);
        return date >= monthStart && date <= monthEnd;
      })
      .reduce(
        (acc, t) => {
          if (t.type === 'income') {
            acc.income += t.amount;
          } else {
            acc.expense += t.amount;
          }
          return acc;
        },
        { income: 0, expense: 0 }
      );
  }, [filteredTransactions, currentMonth]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  return (
    <div className="space-y-4">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
          Календарь
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center">
            {format(currentMonth, 'LLLL yyyy', { locale: ru })}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Статистика месяца */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-emerald-100 bg-emerald-50/50">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-full">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] text-emerald-600/70">Доходы за месяц</p>
              <p className="text-base font-bold text-emerald-600">
                +{formatCurrency(monthStats.income)} ₽
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-rose-100 bg-rose-50/50">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 bg-rose-100 rounded-full">
              <TrendingDown className="h-4 w-4 text-rose-600" />
            </div>
            <div>
              <p className="text-[10px] text-rose-600/70">Расходы за месяц</p>
              <p className="text-base font-bold text-rose-600">
                -{formatCurrency(monthStats.expense)} ₽
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Календарь */}
      <Card className="border-zinc-200/50 shadow-sm">
        <CardContent className="p-3">
          {/* Дни недели */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-[10px] font-medium text-zinc-500 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Дни месяца */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayData = dayTotals[dateKey];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const hasTransactions = dayData && (dayData.income > 0 || dayData.expense > 0);

              return (
                <button
                  key={dateKey}
                  onClick={() => handleDateClick(day)}
                  className={`
                    relative p-1.5 rounded-lg text-xs transition-all min-h-[52px] flex flex-col
                    ${!isCurrentMonth ? 'text-zinc-300' : 'text-zinc-700'}
                    ${isToday(day) ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                    ${isSelected ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100'}
                  `}
                >
                  <span className="font-medium">{format(day, 'd')}</span>
                  {hasTransactions && isCurrentMonth && (
                    <div className="flex flex-col gap-0.5 mt-auto">
                      {dayData.income > 0 && (
                        <span className={`text-[8px] ${isSelected ? 'text-emerald-300' : 'text-emerald-600'}`}>
                          +{formatCurrency(dayData.income)}
                        </span>
                      )}
                      {dayData.expense > 0 && (
                        <span className={`text-[8px] ${isSelected ? 'text-rose-300' : 'text-rose-600'}`}>
                          -{formatCurrency(dayData.expense)}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Транзакции выбранного дня */}
      {selectedDate && (
        <Card className="border-zinc-200/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-zinc-400" />
              {format(selectedDate, 'd MMMM yyyy', { locale: ru })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedDayTransactions.length > 0 ? (
              selectedDayTransactions.map(t => {
                const category = categories.find(c => c.id === t.categoryId);
                return (
                  <div 
                    key={t.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-zinc-50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{category?.icon || '📝'}</span>
                      <div>
                        <p className="text-sm font-medium text-zinc-800">{t.description}</p>
                        <p className="text-[10px] text-zinc-500">{category?.name || 'Без категории'}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)} ₽
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-sm text-zinc-400 py-4">
                Нет операций в этот день
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
