'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Category, Transaction, TransactionType, AccountType } from './types';

const defaultCategories: Category[] = [
  // Личные доходы (можно использовать и для бизнеса)
  { id: '1', name: 'Зарплата', icon: '💼', color: '#22c55e', type: 'income', accountType: 'both' },
  { id: '2', name: 'Фриланс', icon: '💻', color: '#10b981', type: 'income', accountType: 'both' },
  { id: '3', name: 'Инвестиции', icon: '📈', color: '#14b8a6', type: 'income', accountType: 'both' },
  { id: '4', name: 'Подарки', icon: '🎁', color: '#06b6d4', type: 'income', accountType: 'personal' },
  { id: '5', name: 'Другое', icon: '✨', color: '#0ea5e9', type: 'income', accountType: 'both' },
  
  // Бизнес доходы
  { id: 'b1', name: 'Продажи', icon: '🛍️', color: '#22c55e', type: 'income', accountType: 'business' },
  { id: 'b2', name: 'Услуги', icon: '🔧', color: '#10b981', type: 'income', accountType: 'business' },
  { id: 'b3', name: 'Консалтинг', icon: '📊', color: '#14b8a6', type: 'income', accountType: 'business' },
  
  // Личные расходы
  { id: '6', name: 'Продукты', icon: '🛒', color: '#f97316', type: 'expense', accountType: 'personal' },
  { id: '7', name: 'Транспорт', icon: '🚗', color: '#ef4444', type: 'expense', accountType: 'both' },
  { id: '8', name: 'Развлечения', icon: '🎬', color: '#ec4899', type: 'expense', accountType: 'personal' },
  { id: '9', name: 'Здоровье', icon: '💊', color: '#f43f5e', type: 'expense', accountType: 'personal' },
  { id: '10', name: 'Одежда', icon: '👕', color: '#d946ef', type: 'expense', accountType: 'personal' },
  { id: '11', name: 'Кафе и рестораны', icon: '🍽️', color: '#a855f7', type: 'expense', accountType: 'personal' },
  { id: '12', name: 'Коммунальные услуги', icon: '🏠', color: '#8b5cf6', type: 'expense', accountType: 'personal' },
  { id: '13', name: 'Связь', icon: '📱', color: '#6366f1', type: 'expense', accountType: 'both' },
  { id: '14', name: 'Образование', icon: '📚', color: '#3b82f6', type: 'expense', accountType: 'both' },
  { id: '15', name: 'Другое', icon: '📦', color: '#64748b', type: 'expense', accountType: 'both' },
  
  // Бизнес расходы
  { id: 'b4', name: 'Аренда офиса', icon: '🏢', color: '#f97316', type: 'expense', accountType: 'business' },
  { id: 'b5', name: 'Зарплата сотрудникам', icon: '👥', color: '#ef4444', type: 'expense', accountType: 'business' },
  { id: 'b6', name: 'Реклама', icon: '📢', color: '#ec4899', type: 'expense', accountType: 'business' },
  { id: 'b7', name: 'Оборудование', icon: '🖥️', color: '#a855f7', type: 'expense', accountType: 'business' },
  { id: 'b8', name: 'Налоги', icon: '📋', color: '#6366f1', type: 'expense', accountType: 'business' },
  { id: 'b9', name: 'Логистика', icon: '📦', color: '#8b5cf6', type: 'expense', accountType: 'business' },
];

interface FinanceStore {
  categories: Category[];
  transactions: Transaction[];
  currentAccountType: AccountType;
  
  // Account Type
  setAccountType: (type: AccountType) => void;
  
  // Categories
  addCategory: (category: Omit<Category, 'id'>) => string;
  updateCategory: (id: string, category: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  
  // Transactions
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
  addMultipleTransactions: (transactions: Omit<Transaction, 'id' | 'createdAt'>[]) => void;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  
  // Stats
  getStats: (startDate?: Date, endDate?: Date, accountType?: AccountType) => {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    byCategory: { categoryId: string; total: number }[];
  };
  
  // Helper
  getCategoryById: (id: string) => Category | undefined;
  getFilteredCategories: (type: TransactionType, accountType: AccountType) => Category[];
}

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set, get) => ({
      categories: defaultCategories,
      transactions: [],
      currentAccountType: 'personal',
      
      setAccountType: (type) => {
        set({ currentAccountType: type });
      },
      
      addCategory: (category) => {
        const newCategory: Category = {
          ...category,
          id: uuidv4(),
        };
        set((state) => ({
          categories: [...state.categories, newCategory],
        }));
        return newCategory.id;
      },
      
      updateCategory: (id, updates) => {
        set((state) => ({
          categories: state.categories.map((cat) =>
            cat.id === id ? { ...cat, ...updates } : cat
          ),
        }));
      },
      
      deleteCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter((cat) => cat.id !== id),
          transactions: state.transactions.filter((t) => t.categoryId !== id),
        }));
      },
      
      addTransaction: (transaction) => {
        const newTransaction: Transaction = {
          ...transaction,
          id: uuidv4(),
          createdAt: new Date(),
        };
        set((state) => ({
          transactions: [newTransaction, ...state.transactions],
        }));
      },
      
      addMultipleTransactions: (transactions) => {
        const newTransactions: Transaction[] = transactions.map((t) => ({
          ...t,
          id: uuidv4(),
          createdAt: new Date(),
        }));
        set((state) => ({
          transactions: [...newTransactions, ...state.transactions],
        }));
      },
      
      updateTransaction: (id, updates) => {
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        }));
      },
      
      deleteTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        }));
      },
      
      getStats: (startDate, endDate, accountType) => {
        const { transactions, currentAccountType } = get();
        const filterAccountType = accountType || currentAccountType;
        
        let filtered = transactions.filter((t) => t.accountType === filterAccountType);
        
        if (startDate) {
          filtered = filtered.filter((t) => new Date(t.date) >= startDate);
        }
        if (endDate) {
          filtered = filtered.filter((t) => new Date(t.date) <= endDate);
        }
        
        const totalIncome = filtered
          .filter((t) => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
          
        const totalExpense = filtered
          .filter((t) => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);
          
        const byCategory = filtered.reduce((acc, t) => {
          const existing = acc.find((item) => item.categoryId === t.categoryId);
          if (existing) {
            existing.total += t.amount;
          } else {
            acc.push({ categoryId: t.categoryId, total: t.amount });
          }
          return acc;
        }, [] as { categoryId: string; total: number }[]);
        
        return {
          totalIncome,
          totalExpense,
          balance: totalIncome - totalExpense,
          byCategory,
        };
      },
      
      getCategoryById: (id) => {
        return get().categories.find((cat) => cat.id === id);
      },
      
      getFilteredCategories: (type, accountType) => {
        return get().categories.filter((cat) => 
          cat.type === type && 
          (cat.accountType === accountType || cat.accountType === 'both')
        );
      },
    }),
    {
      name: 'finance-storage',
      partialize: (state) => ({
        categories: state.categories,
        currentAccountType: state.currentAccountType,
        transactions: state.transactions.map(t => ({
          ...t,
          date: t.date instanceof Date ? t.date.toISOString() : t.date,
          createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
        })),
      }),
    }
  )
);









