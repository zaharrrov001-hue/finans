'use client';

import { useMemo, useState } from 'react';
import { useFinanceStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { MoreVertical, Trash2, Edit, Image, Receipt } from 'lucide-react';
import { Transaction } from '@/lib/types';

interface TransactionListProps {
  onEdit?: (transaction: Transaction) => void;
}

export function TransactionList({ onEdit }: TransactionListProps) {
  const { transactions, categories, deleteTransaction, currentAccountType } = useFinanceStore();
  const [selectedAttachment, setSelectedAttachment] = useState<string | null>(null);

  // Фильтруем по текущему типу аккаунта
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => t.accountType === currentAccountType);
  }, [transactions, currentAccountType]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (isToday(d)) return 'Сегодня';
    if (isYesterday(d)) return 'Вчера';
    return format(d, 'd MMMM', { locale: ru });
  };

  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    
    filteredTransactions.forEach((t) => {
      const date = typeof t.date === 'string' ? parseISO(t.date) : t.date;
      const key = format(date, 'yyyy-MM-dd');
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(t);
    });
    
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({
        date: parseISO(date),
        transactions: items,
      }));
  }, [filteredTransactions]);

  return (
    <>
      <Card className="border-zinc-200/50 shadow-sm bg-white/80 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-zinc-800">
            История операций
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px] md:h-[600px]">
            {groupedTransactions.length > 0 ? (
              <div className="divide-y divide-zinc-100">
                {groupedTransactions.map((group) => (
                  <div key={group.date.toISOString()} className="px-6">
                    <div className="sticky top-0 bg-white/95 backdrop-blur py-3 z-10">
                      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        {formatDate(group.date)}
                      </span>
                    </div>
                    <div className="space-y-1 pb-3">
                      {group.transactions.map((transaction) => {
                        const category = categories.find(
                          (c) => c.id === transaction.categoryId
                        );
                        const isIncome = transaction.type === 'income';

                        return (
                          <div
                            key={transaction.id}
                            className="flex items-center justify-between py-3 px-3 -mx-3 rounded-xl hover:bg-zinc-50 transition-colors group"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                                style={{
                                  backgroundColor: category ? `${category.color}15` : '#f4f4f5',
                                }}
                              >
                                {category?.icon || '📁'}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-zinc-900 truncate">
                                  {transaction.description || category?.name || 'Без описания'}
                                </p>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="secondary"
                                    className={`text-xs font-normal ${category ? 'bg-zinc-100 text-zinc-600' : 'bg-amber-100 text-amber-700'} hover:bg-zinc-100`}
                                  >
                                    {category?.name || 'Без категории'}
                                  </Badge>
                                  {transaction.attachments?.length > 0 && (
                                    <button
                                      onClick={() =>
                                        setSelectedAttachment(
                                          transaction.attachments[0].url
                                        )
                                      }
                                      className="text-zinc-400 hover:text-zinc-600"
                                    >
                                      <Image className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`text-sm font-semibold ${
                                  isIncome ? 'text-emerald-600' : 'text-zinc-900'
                                }`}
                              >
                                {isIncome ? '+' : '-'}
                                {formatCurrency(transaction.amount)}
                              </span>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => onEdit?.(transaction)}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Редактировать
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-rose-600"
                                    onClick={() =>
                                      deleteTransaction(transaction.id)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Удалить
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-6">
                <Receipt className="h-12 w-12 mx-auto mb-3 text-zinc-300" />
                <p className="text-sm text-zinc-500">Нет операций</p>
                <p className="text-xs text-zinc-400">
                  Добавьте первую транзакцию
                </p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedAttachment}
        onOpenChange={() => setSelectedAttachment(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Прикреплённый файл</DialogTitle>
          </DialogHeader>
          {selectedAttachment && (
            <img
              src={selectedAttachment}
              alt="Attachment"
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}









