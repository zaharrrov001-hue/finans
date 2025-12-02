'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { Navigation } from '@/components/navigation';
import { Dashboard } from '@/components/dashboard';
import { TransactionList } from '@/components/transaction-list';
import { CategoryManager } from '@/components/category-manager';
import { AddTransactionDialog } from '@/components/add-transaction-dialog';
import { AIChat } from '@/components/ai-chat';
import { AuthForm } from '@/components/auth-form';
import { Transaction } from '@/lib/types';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleEdit = (transaction: Transaction) => {
    setEditTransaction(transaction);
    setIsAddDialogOpen(true);
  };

  const handleCloseDialog = (open: boolean) => {
    setIsAddDialogOpen(open);
    if (!open) {
      setEditTransaction(null);
    }
  };

  // Loading state
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50/50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          <p className="text-sm text-zinc-500">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Login/Register screen
  if (!isAuthenticated) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-zinc-50/50 bg-pattern">
      <div className="flex">
        {/* Desktop Sidebar */}
        <Navigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onAddClick={() => setIsAddDialogOpen(true)}
        />

        {/* Main Content */}
        <main className="flex-1 min-h-screen">
          {/* Mobile padding for header */}
          <div className="h-16 md:hidden" />
          
          <div className="p-4 md:p-8 pb-24 md:pb-8">
            <div className="max-w-4xl mx-auto">
              {activeTab === 'dashboard' && (
                <div className="space-y-6 animate-slide-in-up">
                  <Dashboard />
                  <TransactionList onEdit={handleEdit} />
                </div>
              )}

              {activeTab === 'transactions' && (
                <div className="space-y-4 animate-slide-in-up">
                  <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                      Все операции
                    </h1>
                  </div>
                  <TransactionList onEdit={handleEdit} />
                </div>
              )}

              {activeTab === 'categories' && (
                <div className="space-y-4 animate-slide-in-up">
                  <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                    Категории
                  </h1>
                  <CategoryManager />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Add/Edit Transaction Dialog */}
      <AddTransactionDialog
        open={isAddDialogOpen}
        onOpenChange={handleCloseDialog}
        editTransaction={editTransaction}
      />

      {/* AI Chat Dialog */}
      <AIChat
        open={isAIChatOpen}
        onOpenChange={setIsAIChatOpen}
      />

      {/* AI Chat FAB Button */}
      <Button
        onClick={() => setIsAIChatOpen(true)}
        className="fixed bottom-24 md:bottom-8 right-4 md:right-8 h-14 w-14 rounded-full bg-zinc-700 hover:bg-zinc-600 shadow-lg shadow-zinc-900/30 z-40 transition-all hover:scale-105"
      >
        <Sparkles className="h-6 w-6" />
      </Button>
    </div>
  );
}
