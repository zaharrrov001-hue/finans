'use client';

import { useState } from 'react';
import { useFinanceStore } from '@/lib/store';
import { Category, TransactionType, AccountType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Edit2, Trash2, Tag, User, Briefcase, Globe } from 'lucide-react';

const EMOJI_LIST = [
  '💼', '💻', '📈', '🎁', '✨', '💰', '🏆', '🎯',
  '🛒', '🚗', '🎬', '💊', '👕', '🍽️', '🏠', '📱',
  '📚', '📦', '✈️', '🎮', '🏃', '💇', '🎵', '🍕',
  '☕', '🎨', '🔧', '🐕', '💐', '🍺', '📸', '🎓',
  '🏢', '👥', '📢', '🖥️', '📋', '🛍️', '🔧', '📊',
];

const COLOR_LIST = [
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316', '#f59e0b',
  '#eab308', '#84cc16', '#64748b',
];

const accountTypeLabels = {
  personal: { label: 'Личное', icon: User },
  business: { label: 'Бизнес', icon: Briefcase },
  both: { label: 'Общее', icon: Globe },
};

export function CategoryManager() {
  const { categories, addCategory, updateCategory, deleteCategory, currentAccountType } = useFinanceStore();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📦');
  const [color, setColor] = useState('#64748b');
  const [type, setType] = useState<TransactionType>('expense');
  const [accountType, setAccountType] = useState<AccountType | 'both'>('personal');

  // Фильтруем категории по текущему типу аккаунта
  const filteredCategories = categories.filter(
    c => c.accountType === currentAccountType || c.accountType === 'both'
  );

  const incomeCategories = filteredCategories.filter((c) => c.type === 'income');
  const expenseCategories = filteredCategories.filter((c) => c.type === 'expense');

  const openDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setName(category.name);
      setIcon(category.icon);
      setColor(category.color);
      setType(category.type);
      setAccountType(category.accountType);
    } else {
      setEditingCategory(null);
      setName('');
      setIcon('📦');
      setColor('#64748b');
      setType('expense');
      setAccountType(currentAccountType);
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;

    if (editingCategory) {
      updateCategory(editingCategory.id, { name, icon, color, type, accountType });
    } else {
      addCategory({ name, icon, color, type, accountType });
    }

    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteCategory(id);
    setDeleteConfirmId(null);
  };

  const CategoryItem = ({ category }: { category: Category }) => {
    const AccountIcon = accountTypeLabels[category.accountType].icon;
    
    return (
      <div className="flex items-center justify-between py-3 px-3 -mx-3 rounded-xl hover:bg-zinc-50 transition-colors group">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
            style={{ backgroundColor: `${category.color}20` }}
          >
            {category.icon}
          </div>
          <div>
            <span className="font-medium text-zinc-800">{category.name}</span>
            <div className="flex items-center gap-1 mt-0.5">
              <AccountIcon className="h-3 w-3 text-zinc-400" />
              <span className="text-xs text-zinc-400">
                {accountTypeLabels[category.accountType].label}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => openDialog(category)}
          >
            <Edit2 className="h-4 w-4 text-zinc-500" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setDeleteConfirmId(category.id)}
          >
            <Trash2 className="h-4 w-4 text-rose-500" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <Card className="border-zinc-200/50 shadow-sm bg-white/80 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium text-zinc-800 flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Управление категориями
            <Badge variant="secondary" className="ml-2">
              {currentAccountType === 'personal' ? '👤 Личное' : '💼 Бизнес'}
            </Badge>
          </CardTitle>
          <Button size="sm" onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-1" />
            Добавить
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="expense">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="expense">
                Расходы ({expenseCategories.length})
              </TabsTrigger>
              <TabsTrigger value="income">
                Доходы ({incomeCategories.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="expense">
              <ScrollArea className="h-[400px]">
                <div className="space-y-1 px-1">
                  {expenseCategories.length > 0 ? (
                    expenseCategories.map((cat) => (
                      <CategoryItem key={cat.id} category={cat} />
                    ))
                  ) : (
                    <div className="text-center py-8 text-zinc-500">
                      <p className="text-sm">Нет категорий расходов</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="income">
              <ScrollArea className="h-[400px]">
                <div className="space-y-1 px-1">
                  {incomeCategories.length > 0 ? (
                    incomeCategories.map((cat) => (
                      <CategoryItem key={cat.id} category={cat} />
                    ))
                  ) : (
                    <div className="text-center py-8 text-zinc-500">
                      <p className="text-sm">Нет категорий доходов</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Диалог редактирования */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Редактировать категорию' : 'Новая категория'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                placeholder="Название категории"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Тип</Label>
                <Select value={type} onValueChange={(v) => setType(v as TransactionType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Расход</SelectItem>
                    <SelectItem value="income">Доход</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Счёт</Label>
                <Select value={accountType} onValueChange={(v) => setAccountType(v as AccountType | 'both')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Личное
                      </div>
                    </SelectItem>
                    <SelectItem value="business">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Бизнес
                      </div>
                    </SelectItem>
                    <SelectItem value="both">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Общее (оба)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Иконка</Label>
              <div className="grid grid-cols-8 gap-2">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIcon(emoji)}
                    className={`w-10 h-10 rounded-lg text-lg flex items-center justify-center transition-all ${
                      icon === emoji
                        ? 'bg-zinc-900 scale-110'
                        : 'bg-zinc-100 hover:bg-zinc-200'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Цвет</Label>
              <div className="grid grid-cols-9 gap-2">
                {COLOR_LIST.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full transition-all ${
                      color === c ? 'ring-2 ring-offset-2 ring-zinc-400 scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Превью</Label>
              <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${color}20` }}
                >
                  {icon}
                </div>
                <div>
                  <span className="font-medium text-zinc-800">
                    {name || 'Название категории'}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    {accountType === 'personal' && <User className="h-3 w-3 text-zinc-400" />}
                    {accountType === 'business' && <Briefcase className="h-3 w-3 text-zinc-400" />}
                    {accountType === 'both' && <Globe className="h-3 w-3 text-zinc-400" />}
                    <span className="text-xs text-zinc-400">
                      {accountTypeLabels[accountType].label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {editingCategory ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Подтверждение удаления */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить категорию?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Все транзакции в этой категории также будут удалены.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 hover:bg-rose-600"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}







