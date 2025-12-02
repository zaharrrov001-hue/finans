'use client';

import { useState, useRef, useEffect } from 'react';
import { useFinanceStore } from '@/lib/store';
import { useSettingsStore } from '@/lib/settings-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Send, 
  Loader2, 
  Copy, 
  Check,
  Sparkles,
  TrendingUp,
  TrendingDown,
  PieChart,
  Mic,
  MicOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIChat({ open, onOpenChange }: AIChatProps) {
  const { transactions, categories, currentAccountType, addCategory } = useFinanceStore();
  const { openaiApiKey } = useSettingsStore();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Привет! 👋 Я ваш финансовый ассистент. Спросите меня о ваших расходах, доходах или попросите проанализировать траты.\n\n💡 Примеры:\n• "Сколько я потратил на кофе?"\n• "Какие мои топ-5 расходов?"\n• "Сравни расходы за этот и прошлый месяц"\n• "Добавь категорию Подписки"\n\n🎤 Можете спрашивать голосом!',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startVoiceRecording = () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        toast.error('Голосовой ввод не поддерживается');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'ru-RU';
      recognition.continuous = true;
      recognition.interimResults = true;

      let finalTranscript = input;

      recognition.onstart = () => {
        setIsRecording(true);
        toast.info('🎤 Говорите...', { duration: 1500 });
      };

      recognition.onresult = (event: any) => {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript = finalTranscript ? `${finalTranscript} ${transcript}` : transcript;
            setInput(finalTranscript);
          } else {
            interim += transcript;
          }
        }
        setInterimText(interim);

        // Auto-stop after 2 seconds of silence
        silenceTimerRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
        }, 2000);
      };

      recognition.onerror = (event: any) => {
        console.error('Voice error:', event.error);
        if (event.error !== 'no-speech') {
          toast.error('Ошибка голосового ввода');
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        setInterimText('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error('Voice input error:', error);
      toast.error('Ошибка голосового ввода');
    }
  };

  const stopVoiceRecording = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setInterimText('');
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Скопировано');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getFinancialContext = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const currentTransactions = transactions.filter(
      t => t.accountType === currentAccountType
    );

    const thisMonthTransactions = currentTransactions.filter(
      t => new Date(t.date) >= startOfMonth
    );

    const lastMonthTransactions = currentTransactions.filter(
      t => new Date(t.date) >= startOfLastMonth && new Date(t.date) <= endOfLastMonth
    );

    const thisMonthExpenses = thisMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const thisMonthIncome = thisMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const lastMonthExpenses = lastMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Группировка по категориям
    const expensesByCategory: { [key: string]: { name: string; amount: number; count: number } } = {};
    thisMonthTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const cat = categories.find(c => c.id === t.categoryId);
        const catName = cat?.name || 'Без категории';
        if (!expensesByCategory[catName]) {
          expensesByCategory[catName] = { name: catName, amount: 0, count: 0 };
        }
        expensesByCategory[catName].amount += t.amount;
        expensesByCategory[catName].count += 1;
      });

    const topExpenses = Object.values(expensesByCategory)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // Транзакции без категорий
    const uncategorized = currentTransactions.filter(t => !t.categoryId);

    return {
      currentMonth: format(now, 'LLLL yyyy', { locale: ru }),
      lastMonth: format(startOfLastMonth, 'LLLL yyyy', { locale: ru }),
      accountType: currentAccountType === 'personal' ? 'личный' : 'бизнес',
      thisMonthExpenses,
      thisMonthIncome,
      lastMonthExpenses,
      balance: thisMonthIncome - thisMonthExpenses,
      topExpenses,
      totalTransactions: thisMonthTransactions.length,
      uncategorizedCount: uncategorized.length,
      categories: categories.filter(c => c.accountType === currentAccountType || c.accountType === 'both'),
      recentTransactions: thisMonthTransactions.slice(0, 20).map(t => ({
        description: t.description,
        amount: t.amount,
        type: t.type,
        category: categories.find(c => c.id === t.categoryId)?.name || 'Без категории',
        date: format(new Date(t.date), 'd MMM', { locale: ru }),
      })),
    };
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    if (!openaiApiKey) {
      toast.error('Добавьте OpenAI API ключ в настройках');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const context = getFinancialContext();
      
      const systemPrompt = `Ты финансовый ассистент для приложения учёта расходов. Отвечай на русском языке, кратко и по делу.

Текущие данные пользователя (${context.accountType} счёт):
- Месяц: ${context.currentMonth}
- Расходы за месяц: ${context.thisMonthExpenses.toLocaleString()} ₽
- Доходы за месяц: ${context.thisMonthIncome.toLocaleString()} ₽
- Баланс: ${context.balance.toLocaleString()} ₽
- Расходы прошлый месяц (${context.lastMonth}): ${context.lastMonthExpenses.toLocaleString()} ₽
- Всего операций: ${context.totalTransactions}
- Без категории: ${context.uncategorizedCount}

Топ расходов по категориям:
${context.topExpenses.map((e, i) => `${i + 1}. ${e.name}: ${e.amount.toLocaleString()} ₽ (${e.count} операций)`).join('\n')}

Последние операции:
${context.recentTransactions.map(t => `- ${t.description}: ${t.type === 'expense' ? '-' : '+'}${t.amount}₽ (${t.category}, ${t.date})`).join('\n')}

Существующие категории: ${context.categories.map(c => c.name).join(', ')}

Если пользователь просит добавить категорию, ответь в формате:
[ADD_CATEGORY: название категории, тип (expense/income), иконка-эмодзи]

Форматируй числа с пробелами (1 000 ₽). Используй эмодзи для наглядности.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage.content },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка API');
      }

      const data = await response.json();
      let assistantContent = data.choices[0]?.message?.content || 'Не удалось получить ответ';

      // Проверяем команду добавления категории
      const addCategoryMatch = assistantContent.match(/\[ADD_CATEGORY:\s*([^,]+),\s*(expense|income),\s*([^\]]+)\]/);
      if (addCategoryMatch) {
        const [, name, type, icon] = addCategoryMatch;
        addCategory({
          name: name.trim(),
          type: type as 'expense' | 'income',
          icon: icon.trim(),
          color: '#6366f1',
          accountType: currentAccountType,
        });
        assistantContent = assistantContent.replace(/\[ADD_CATEGORY:[^\]]+\]/, '');
        assistantContent += `\n\n✅ Категория "${name.trim()}" добавлена!`;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent.trim(),
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Chat error:', error);
      toast.error('Ошибка при отправке сообщения');
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Извините, произошла ошибка. Проверьте API ключ в настройках.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickQuestions = [
    { icon: <PieChart className="h-3 w-3" />, text: 'Топ расходов' },
    { icon: <TrendingDown className="h-3 w-3" />, text: 'Сколько потратил?' },
    { icon: <TrendingUp className="h-3 w-3" />, text: 'Сравни с прошлым месяцем' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg h-[600px] flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500" />
            AI Ассистент
          </DialogTitle>
        </DialogHeader>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  message.role === 'user'
                    ? 'bg-violet-500 text-white'
                    : 'bg-zinc-100 text-zinc-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <div className="flex items-center justify-between mt-1.5 gap-2">
                  <span className={`text-xs ${message.role === 'user' ? 'text-violet-200' : 'text-zinc-400'}`}>
                    {format(message.timestamp, 'HH:mm')}
                  </span>
                  {message.role === 'assistant' && (
                    <button
                      onClick={() => copyToClipboard(message.content, message.id)}
                      className="text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                      {copiedId === message.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-zinc-100 rounded-2xl px-4 py-3">
                <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
              </div>
            </div>
          )}
        </div>

        {/* Quick questions */}
        {messages.length <= 2 && (
          <div className="px-4 pb-2 flex gap-2 flex-wrap">
            {quickQuestions.map((q, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                onClick={() => setInput(q.text)}
                className="text-xs gap-1.5"
              >
                {q.icon}
                {q.text}
              </Button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t space-y-2">
          {isRecording && interimText && (
            <div className="text-xs text-rose-500 px-1 truncate animate-pulse">
              🎤 {interimText}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex gap-2"
          >
            <Button
              type="button"
              variant={isRecording ? 'destructive' : 'outline'}
              size="icon"
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              disabled={isLoading}
              className={cn(
                "shrink-0 h-10 w-10",
                isRecording && "animate-pulse"
              )}
            >
              {isRecording ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Спросите о ваших финансах..."
              disabled={isLoading || isRecording}
              className={cn(
                "flex-1",
                isRecording && "border-rose-300 bg-rose-50/30"
              )}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-violet-500 hover:bg-violet-600 shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}



