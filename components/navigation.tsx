'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { UserMenu } from '@/components/user-menu';
import {
  LayoutDashboard,
  Receipt,
  Tag,
  Menu,
  Plus,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAddClick: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'Обзор', icon: LayoutDashboard },
  { id: 'transactions', label: 'Операции', icon: Receipt },
  { id: 'categories', label: 'Категории', icon: Tag },
];

export function Navigation({ activeTab, onTabChange, onAddClick }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-zinc-200/50 h-screen sticky top-0">
        {/* Logo */}
        <div className="p-6 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-700 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-zinc-900">Финансы</h1>
              <p className="text-xs text-zinc-500">Личный учёт</p>
            </div>
          </div>
        </div>

        {/* Add Button - Prominent Position */}
        <div className="p-4">
          <Button 
            onClick={onAddClick} 
            className="w-full h-12 gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25"
          >
            <Plus className="h-5 w-5" />
            Добавить операцию
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                activeTab === item.id
                  ? 'bg-zinc-700 text-white shadow-md'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* User Menu at Bottom */}
        <div className="p-4 border-t border-zinc-100">
          <div className="flex items-center justify-between">
            <UserMenu />
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-zinc-200/50">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zinc-900 to-zinc-700 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-zinc-900">Финансы</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Add Button - Mobile Header */}
            <Button
              onClick={onAddClick}
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1 shadow-md"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Добавить</span>
            </Button>
            
            <UserMenu />
            
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle>Меню</SheetTitle>
                </SheetHeader>
                <nav className="mt-6 space-y-1">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onTabChange(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                        activeTab === item.id
                          ? 'bg-zinc-700 text-white shadow-md'
                          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </button>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-t border-zinc-200/50 safe-area-pb">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all',
                activeTab === item.id
                  ? 'text-zinc-900'
                  : 'text-zinc-400'
              )}
            >
              <item.icon className={cn(
                'h-5 w-5',
                activeTab === item.id && 'scale-110'
              )} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}







