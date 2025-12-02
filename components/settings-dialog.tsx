'use client';

import { useState } from 'react';
import { useSettingsStore } from '@/lib/settings-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Settings, 
  Key, 
  Sparkles, 
  Eye, 
  EyeOff,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { 
    openaiApiKey, 
    autoCategorizationEnabled,
    setOpenaiApiKey, 
    setAutoCategorizationEnabled,
    clearApiKey,
  } = useSettingsStore();
  
  const [apiKeyInput, setApiKeyInput] = useState(openaiApiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = () => {
    setOpenaiApiKey(apiKeyInput);
    toast.success('Настройки сохранены');
    onOpenChange(false);
  };

  const handleClearApiKey = () => {
    setApiKeyInput('');
    clearApiKey();
    toast.info('API ключ удалён');
  };

  const testApiKey = async () => {
    if (!apiKeyInput) {
      toast.error('Введите API ключ');
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKeyInput}`,
        },
      });

      if (response.ok) {
        toast.success('✓ API ключ работает!');
      } else {
        const error = await response.json();
        toast.error(`Ошибка: ${error.error?.message || 'Неверный ключ'}`);
      }
    } catch (error) {
      toast.error('Ошибка подключения к OpenAI');
    } finally {
      setIsTesting(false);
    }
  };

  const maskApiKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return key.slice(0, 4) + '••••••••' + key.slice(-4);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Настройки
          </DialogTitle>
          <DialogDescription>
            Настройте автоматическую категоризацию с помощью AI
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Автокатегоризация */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Автокатегоризация</Label>
              <p className="text-sm text-muted-foreground">
                Автоматически определять категории по ключевым словам
              </p>
            </div>
            <Button
              type="button"
              variant={autoCategorizationEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoCategorizationEnabled(!autoCategorizationEnabled)}
            >
              {autoCategorizationEnabled ? "Вкл" : "Выкл"}
            </Button>
          </div>

          {/* OpenAI API Key */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500" />
              <Label className="text-base">OpenAI API ключ</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Для умного определения категорий с помощью GPT.
              Получите ключ на{' '}
              <a 
                href="https://platform.openai.com/api-keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-violet-600 hover:underline inline-flex items-center gap-1"
              >
                platform.openai.com
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="sk-..."
                  className="pl-10 pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={testApiKey}
                disabled={isTesting || !apiKeyInput}
              >
                {isTesting ? 'Проверка...' : 'Тест'}
              </Button>
            </div>

            {openaiApiKey && (
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-700">
                  <Check className="h-4 w-4" />
                  <span className="text-sm font-medium">Ключ сохранён</span>
                  <span className="text-xs text-emerald-600 font-mono">
                    {maskApiKey(openaiApiKey)}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearApiKey}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Информация */}
          <div className="p-3 bg-zinc-50 rounded-lg text-sm text-zinc-600 space-y-1">
            <p className="font-medium">Как работает:</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li>Без API: категории определяются по ключевым словам</li>
              <li>С API: GPT анализирует описание и выбирает лучшую категорию</li>
              <li>Стоимость: ~$0.001 за запрос (модель gpt-3.5-turbo)</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSave}>
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}





