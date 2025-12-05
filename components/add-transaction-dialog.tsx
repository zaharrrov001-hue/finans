'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useFinanceStore } from '@/lib/store';
import { Transaction, TransactionType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  CalendarIcon,
  Mic,
  Camera,
  X,
  Loader2,
  Trash2,
  Sparkles,
  Image,
  Paperclip,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSettingsStore } from '@/lib/settings-store';
import { findCategoryByKeywords } from '@/lib/ai-categorizer';
import Tesseract from 'tesseract.js';

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTransaction?: Transaction | null;
}

interface ParsedItem {
  id: string;
  description: string;
  amount: number;
  categoryId: string | null;
}

// Словарь для преобразования слов в числа
const russianNumberWords: { [key: string]: number } = {
  'ноль': 0, 'один': 1, 'одна': 1, 'два': 2, 'две': 2, 'три': 3, 'четыре': 4,
  'пять': 5, 'шесть': 6, 'семь': 7, 'восемь': 8, 'девять': 9, 'десять': 10,
  'одиннадцать': 11, 'двенадцать': 12, 'тринадцать': 13, 'четырнадцать': 14,
  'пятнадцать': 15, 'шестнадцать': 16, 'семнадцать': 17, 'восемнадцать': 18,
  'девятнадцать': 19, 'двадцать': 20, 'тридцать': 30, 'сорок': 40,
  'пятьдесят': 50, 'шестьдесят': 60, 'семьдесят': 70, 'восемьдесят': 80,
  'девяносто': 90, 'сто': 100, 'двести': 200, 'триста': 300, 'четыреста': 400,
  'пятьсот': 500, 'шестьсот': 600, 'семьсот': 700, 'восемьсот': 800,
  'девятьсот': 900, 'тысяча': 1000, 'тысячи': 1000, 'тысяч': 1000,
};

function parseRussianNumber(text: string): number | null {
  const lowerText = text.toLowerCase();
  const digitMatch = lowerText.match(/(\d+)/);
  if (digitMatch) {
    return parseInt(digitMatch[1], 10);
  }
  
  let total = 0;
  let current = 0;
  const words = lowerText.split(/\s+/);
  
  for (const word of words) {
    const cleanWord = word.replace(/[^а-яё]/g, '');
    if (russianNumberWords[cleanWord] !== undefined) {
      const value = russianNumberWords[cleanWord];
      if (value >= 1000) {
        if (current === 0) current = 1;
        current *= value;
        total += current;
        current = 0;
      } else if (value >= 100) {
        current += value;
      } else {
        current += value;
      }
    }
  }
  
  total += current;
  return total > 0 ? total : null;
}

// Функция предобработки изображения (Super Scanner Lens)
// Делает изображение черно-белым и повышает контраст для лучшего OCR
const preprocessImage = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(URL.createObjectURL(file));
        return;
      }

      // Устанавливаем размер канваса
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Рисуем исходное изображение
      ctx.drawImage(img, 0, 0);
      
      // Получаем пиксели
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Проходим по всем пикселям
      for (let i = 0; i < data.length; i += 4) {
        // Получаем яркость (grayscale)
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Формула яркости для человеческого глаза
        const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        
        // Повышаем контраст (бинаризация с порогом)
        // Если пиксель светлый -> делаем белым, если темный -> черным
        // Порог 160 подходит для чеков (белая бумага) и темных скринов (белый текст)
        // Но для банковских скринов (серый фон) лучше мягкий контраст
        
        // Используем контраст:
        let val = gray;
        // Усиливаем черное и белое
        if (val > 140) val = 255; // Фон
        else if (val < 100) val = 0; // Текст
        
        data[i] = val;     // R
        data[i + 1] = val; // G
        data[i + 2] = val; // B
      }
      
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.9)); // Качество 0.9
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

// Умный парсер для автоматического определения количества операций
function parseInput(input: string): ParsedItem[] {
  if (!input.trim()) return [];
  
  const text = input.trim()
    .replace(/\s+/g, ' ')  // Убираем лишние пробелы
    .replace(/[.,;]\s*$/g, ''); // Убираем знаки в конце
  
  const items: ParsedItem[] = [];
  
  // Способ 1: Ищем все пары "слово(а) + число" с помощью scan-подхода
  // Разбиваем текст на токены и ищем паттерны
  const tokens = text.split(/\s+/);
  
  let currentDesc: string[] = [];
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    // Убираем "руб", "р", "₽" из токена
    const cleanToken = token.replace(/[,;.₽]/g, '').replace(/^руб(лей|ля)?$/i, '').replace(/^р$/i, '');
    
    // Проверяем, это число или нет
    const isNumber = /^\d+([.,]\d+)?$/.test(cleanToken);
    
    if (isNumber && cleanToken) {
      const amount = parseFloat(cleanToken.replace(',', '.'));
      
      if (currentDesc.length > 0 && amount > 0) {
        // Нашли пару: описание + сумма
        items.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}-${items.length}`,
          description: currentDesc.join(' '),
          amount: amount,
          categoryId: null,
        });
        currentDesc = [];
      } else if (amount > 0) {
        // Число без описания - смотрим следующие токены
        const nextWords: string[] = [];
        let j = i + 1;
        
        // Собираем слова после числа до следующего числа или конца
        while (j < tokens.length) {
          const nextToken = tokens[j].replace(/[,;.₽]/g, '').replace(/^руб(лей|ля)?$/i, '').replace(/^р$/i, '');
          if (/^\d+([.,]\d+)?$/.test(nextToken)) break;
          if (nextToken.length > 0) nextWords.push(tokens[j].replace(/[,;]/g, ''));
          j++;
        }
        
        if (nextWords.length > 0) {
          items.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}-${items.length}`,
            description: nextWords.join(' '),
            amount: amount,
            categoryId: null,
          });
          i = j - 1; // Перемещаем указатель
        }
      }
    } else if (cleanToken) {
      // Это слово - добавляем к описанию
      // Очищаем от запятых и точек с запятой
      const word = token.replace(/[,;]/g, '');
      if (word && !/^руб(лей|ля)?$/i.test(word) && !/^р$/i.test(word) && word !== '₽') {
        currentDesc.push(word);
      }
    }
  }
  
  // Если ничего не нашли, пробуем альтернативный метод - разбиение по запятым
  if (items.length === 0 && text.includes(',')) {
    const parts = text.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
    
    for (const part of parts) {
      const numMatch = part.match(/(\d+(?:[.,]\d+)?)/);
      if (numMatch) {
        const amount = parseFloat(numMatch[1].replace(',', '.'));
        let desc = part.replace(/\d+(?:[.,]\d+)?/g, '').replace(/(?:руб(?:лей|ля)?|₽|р\.?)/gi, '').trim();
        
        if (desc && amount > 0) {
          items.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}-${items.length}`,
            description: desc,
            amount: amount,
            categoryId: null,
          });
        }
      }
    }
  }
  
  // Фильтруем пустые и некорректные
  return items.filter(item => 
    item.description.length >= 1 && 
    item.amount > 0 && 
    !/^\d+$/.test(item.description)
  );
}

export function AddTransactionDialog({
  open,
  onOpenChange,
  editTransaction,
}: AddTransactionDialogProps) {
  const { categories, addTransaction, addMultipleTransactions, updateTransaction, currentAccountType, getFilteredCategories, addCategory } = useFinanceStore();
  const { autoCategorizationEnabled, openaiApiKey } = useSettingsStore();
  
  const [type, setType] = useState<TransactionType>('expense');
  const [input, setInput] = useState(''); // Универсальный ввод
  const [defaultCategoryId, setDefaultCategoryId] = useState(''); // Категория по умолчанию
  const [date, setDate] = useState<Date>(new Date());
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [interimText, setInterimText] = useState(''); // Текст в процессе распознавания
  const [baseInput, setBaseInput] = useState(''); // Текст до начала записи
  const [skipParsing, setSkipParsing] = useState(false); // Флаг для пропуска парсинга
  const [isGPTCategorizing, setIsGPTCategorizing] = useState(false); // GPT категоризация
  
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Мемоизируем filteredCategories чтобы избежать бесконечного цикла
  const filteredCategories = useMemo(() => {
    return getFilteredCategories(type, currentAccountType);
  }, [type, currentAccountType, getFilteredCategories]);

  // Автоматический парсинг при вводе
  useEffect(() => {
    if (skipParsing) {
      setSkipParsing(false);
      return;
    }
    
    const items = parseInput(input);
    
    // Применяем автокатегоризацию по ключевым словам сразу
    if (autoCategorizationEnabled && items.length > 0 && filteredCategories.length > 0) {
      const categorizedItems = items.map(item => {
        if (item.categoryId) return item; // Уже есть категория - не трогаем
        
        const foundCategory = findCategoryByKeywords(item.description, filteredCategories);
        return {
          ...item,
          categoryId: foundCategory?.id || null,
        };
      });
      setParsedItems(categorizedItems);
    } else {
      setParsedItems(items);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, skipParsing]);
  

  // Инициализация при открытии диалога
  useEffect(() => {
    if (!open) return;
    
    if (editTransaction) {
      setType(editTransaction.type);
      setSkipParsing(true);
      setInput(`${editTransaction.description} ${editTransaction.amount}`);
      setDefaultCategoryId(editTransaction.categoryId);
      setDate(new Date(editTransaction.date));
      setAttachments(editTransaction.attachments?.map((a) => a.url) || []);
    } else {
      resetForm();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Устанавливаем категорию по умолчанию при смене типа
  useEffect(() => {
    if (filteredCategories.length > 0) {
      const currentExists = filteredCategories.some(c => c.id === defaultCategoryId);
      if (!currentExists) {
        setDefaultCategoryId(filteredCategories[0].id);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, currentAccountType]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  const resetForm = () => {
    setType('expense');
    setInput('');
    setDefaultCategoryId('');
    setDate(new Date());
    setAttachments([]);
    setParsedItems([]);
    setInterimText('');
    setBaseInput('');
    setSkipParsing(false);
  };

  // GPT категоризация
  const runGPTCategorization = async () => {
    if (!openaiApiKey) {
      toast.error('Добавьте API ключ OpenAI в настройках');
      return;
    }

    if (parsedItems.length === 0) {
      toast.error('Сначала введите операции');
      return;
    }

    const itemsWithoutCategory = parsedItems.filter(item => !item.categoryId);
    if (itemsWithoutCategory.length === 0) {
      toast.info('Все операции уже имеют категории');
      return;
    }

    setIsGPTCategorizing(true);

    try {
      const categoryList = filteredCategories.map(c => `${c.icon} ${c.name}`).join(', ');
      
      const prompt = `Определи категории для операций. Используй существующие категории или предложи новые с иконками.

СУЩЕСТВУЮЩИЕ КАТЕГОРИИ: ${categoryList || 'пока нет'}

ОПЕРАЦИИ:
${itemsWithoutCategory.map((item, i) => `${i + 1}. ${item.description} - ${item.amount}₽`).join('\n')}

Ответь JSON массивом:
[{"index": 0, "category": "название", "icon": "эмодзи", "isNew": false}]

Правила:
- Если подходит существующая категория - isNew: false, icon из существующей
- Если нужна новая категория - isNew: true, подбери подходящую иконку-эмодзи
- Иконки должны быть простые эмодзи: 🛒 🍽️ 🚗 💊 🎮 📱 👕 💇 🏠 💡 📚 ✈️ 🎁 💳 🏥 🐕 🌿 💪 🎬 🎵

Только JSON, без объяснений.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 800,
        }),
      });

      if (!response.ok) {
        throw new Error('API error');
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';
      
      // Парсим JSON из ответа
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const gptCategories: { index: number; category: string; icon: string; isNew: boolean }[] = JSON.parse(jsonMatch[0]);
        
        let categorizedCount = 0;
        let newCategoriesCount = 0;
        const updatedItems = [...parsedItems];
        
        for (const { index, category, icon, isNew } of gptCategories) {
          if (category && itemsWithoutCategory[index]) {
            const originalItem = itemsWithoutCategory[index];
            const itemIndex = parsedItems.findIndex(p => p.id === originalItem.id);
            
            if (itemIndex !== -1) {
              // Ищем существующую категорию
              let foundCat = filteredCategories.find(c => 
                c.name.toLowerCase() === category.toLowerCase() ||
                c.name.toLowerCase().includes(category.toLowerCase()) ||
                category.toLowerCase().includes(c.name.toLowerCase())
              );
              
              // Если не нашли и GPT предлагает новую - создаём
              if (!foundCat && isNew) {
                const newCatId = addCategory({
                  name: category,
                  type: type,
                  icon: icon || '📁',
                  color: '#6366f1',
                  accountType: currentAccountType,
                });
                // Находим только что созданную категорию
                foundCat = { id: newCatId, name: category, icon: icon || '📁', type, color: '#6366f1', accountType: currentAccountType };
                newCategoriesCount++;
              }
              
              if (foundCat) {
                updatedItems[itemIndex] = { ...updatedItems[itemIndex], categoryId: foundCat.id };
                categorizedCount++;
              }
            }
          }
        }
        
        if (categorizedCount > 0 || newCategoriesCount > 0) {
          setSkipParsing(true);
          setParsedItems(updatedItems);
          let message = `✨ GPT определил ${categorizedCount} ${categorizedCount === 1 ? 'категорию' : 'категорий'}`;
          if (newCategoriesCount > 0) {
            message += ` (+${newCategoriesCount} новых)`;
          }
          toast.success(message);
        } else {
          toast.info('GPT не смог определить категории');
        }
      }
    } catch (error) {
      console.error('GPT error:', error);
      toast.error('Ошибка GPT');
    } finally {
      setIsGPTCategorizing(false);
    }
  };

  const handleSubmit = () => {
    if (parsedItems.length === 0) {
      toast.error('Введите хотя бы одну операцию');
      return;
    }

    if (editTransaction && parsedItems.length === 1) {
      // Редактирование одной операции
      updateTransaction(editTransaction.id, {
        amount: parsedItems[0].amount,
        description: parsedItems[0].description,
        categoryId: parsedItems[0].categoryId || defaultCategoryId,
        type,
        accountType: currentAccountType,
        date,
        attachments: attachments.map((url, idx) => ({
          id: `att-${idx}`,
          type: 'image' as const,
          url,
        })),
      });
      toast.success('Операция обновлена');
    } else if (parsedItems.length === 1) {
      // Одна новая операция
      addTransaction({
        amount: parsedItems[0].amount,
        description: parsedItems[0].description,
        categoryId: parsedItems[0].categoryId || defaultCategoryId,
        type,
        accountType: currentAccountType,
        date,
        attachments: attachments.map((url, idx) => ({
          id: `att-${idx}`,
          type: 'image' as const,
          url,
        })),
      });
      toast.success('Операция добавлена');
    } else {
      // Несколько операций
      const transactions = parsedItems.map(item => ({
        amount: item.amount,
        description: item.description,
        categoryId: item.categoryId || defaultCategoryId,
        type,
        accountType: currentAccountType,
        date,
        attachments: [],
      }));
      addMultipleTransactions(transactions);
      toast.success(`Добавлено ${transactions.length} операций`);
    }

    resetForm();
    onOpenChange(false);
  };

  const removeItem = (id: string) => {
    const remaining = parsedItems.filter(item => item.id !== id);
    setParsedItems(remaining);
    // Обновляем input с флагом пропуска парсинга
    setSkipParsing(true);
    const newInput = remaining.map(item => `${item.description} ${item.amount}`).join(', ');
    setInput(newInput);
  };

  const updateItemAmount = (id: string, newAmount: string) => {
    const updated = parsedItems.map(item => 
      item.id === id ? { ...item, amount: parseFloat(newAmount) || 0 } : item
    );
    setParsedItems(updated);
    // Обновляем input с флагом пропуска парсинга
    setSkipParsing(true);
    const newInput = updated.map(item => `${item.description} ${item.amount}`).join(', ');
    setInput(newInput);
  };

  const updateItemDescription = (id: string, newDesc: string) => {
    const updated = parsedItems.map(item => 
      item.id === id ? { ...item, description: newDesc } : item
    );
    setParsedItems(updated);
    // Обновляем input с флагом пропуска парсинга
    setSkipParsing(true);
    const newInput = updated.map(item => `${item.description} ${item.amount}`).join(', ');
    setInput(newInput);
  };

  const updateItemCategory = (id: string, categoryId: string) => {
    setParsedItems(prev => prev.map(item => 
      item.id === id ? { ...item, categoryId } : item
    ));
  };

  const getTotalAmount = () => {
    return parsedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  // Голосовой ввод с реальным временем
  const startVoiceRecording = () => {
    const SpeechRecognitionAPI = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      toast.error('Голосовой ввод не поддерживается');
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      
      // Настройки для русского языка
      recognition.lang = 'ru-RU';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      // Сохраняем текущий текст как базу
      const startingInput = input;
      let finalTranscript = startingInput;
      
      setBaseInput(startingInput);
      setInterimText('');

      recognition.onstart = () => {
        setIsRecording(true);
        toast.info('🎤 Говорите чётко: "Молоко 120 бензин 1500"', { duration: 3000 });
      };

      recognition.onresult = (event: any) => {
        // Сбрасываем таймер тишины при каждом результате
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        
        let interim = '';
        let newFinal = '';
        
        // Собираем ВСЕ финальные результаты с начала
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            newFinal += transcript + ' ';
          } else {
            interim += transcript;
          }
        }
        
        newFinal = newFinal.trim();
        
        // Обновляем финальный транскрипт
        if (newFinal) {
          const separator = startingInput ? ', ' : '';
          finalTranscript = startingInput ? startingInput + separator + newFinal : newFinal;
        }
        
        // Обновляем промежуточный текст
        setInterimText(interim);
        
        // Показываем в input: финальный + промежуточный
        const displayText = interim 
          ? (finalTranscript ? finalTranscript + ' ' + interim : interim)
          : finalTranscript;
        
        setInput(displayText);
        setBaseInput(finalTranscript);
        
        // Устанавливаем таймер автостопа через 2 секунды тишины
        silenceTimerRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
            toast.info('⏹ Запись остановлена автоматически', { duration: 1500 });
          }
        }, 2000);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech error:', event.error);
        setIsRecording(false);
        setInterimText('');
        if (event.error === 'no-speech') {
          toast.warning('Речь не обнаружена. Говорите громче и чётче.');
        } else if (event.error === 'not-allowed') {
          toast.error('Доступ к микрофону запрещён');
        } else if (event.error === 'network') {
          toast.error('Ошибка сети. Проверьте подключение.');
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        setInterimText('');
        // Устанавливаем финальный текст
        setInput(finalTranscript);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error('Voice input error:', error);
      toast.error('Ошибка голосового ввода');
    }
  };

  const stopVoiceRecording = () => {
    // Очищаем таймер тишины
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setInterimText('');
    
    // Устанавливаем финальный текст из baseInput
    if (baseInput) {
      setInput(baseInput);
    }
    
    // Показываем результат после небольшой задержки
    setTimeout(() => {
      const items = parseInput(baseInput || input);
      if (items.length > 0) {
        const total = items.reduce((sum, item) => sum + item.amount, 0);
        toast.success(`✓ ${items.length} операций на ${total.toLocaleString()} ₽`, { duration: 2000 });
      }
    }, 200);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith('image/');
      const isPDF = file.type === 'application/pdf';
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileUrl = event.target?.result as string;
        
        // Добавляем файл в attachments
        setAttachments((prev) => [...prev, fileUrl]);
        toast.success(`📎 Файл "${file.name}" добавлен`);

        // Анализ изображений через Tesseract + парсинг
        if (isImage) {
          setIsProcessingOCR(true);
          toast.info('🔍 Улучшаю качество и сканирую...');
          
          try {
            // 0. Предобработка (Super Scanner Lens)
            const processedImage = await preprocessImage(file);

            // 1. Распознаём текст через Tesseract с настройками
            const result = await Tesseract.recognize(processedImage, 'rus+eng', {
              logger: () => {},
              // Настройки для улучшения качества
              // Ограничиваем символы только тем, что бывает в чеках
              // tessedit_char_whitelist: '0123456789.,-абвгдеёжзийклмнопрстуфхцчшщъыьэюяАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ₽$€/:' 
              // (whitelist иногда работает слишком агрессивно, лучше без него если шрифт нестандартный, но добавим базовые параметры)
            });
            const ocrText = result.data.text;
            
            console.log('Raw Tesseract:', ocrText); // Для отладки

            if (!ocrText || ocrText.trim().length < 5) {
              toast.error('Не удалось прочитать текст. Попробуйте другое фото.');
              setIsProcessingOCR(false);
              return;
            }
            
            toast.info('📝 Разбираю операции...');
            
            // 2. Отправляем текст на сервер для парсинга
            const response = await fetch('/api/analyze-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: ocrText,
              }),
            });
            
            if (!response.ok) {
              throw new Error('Ошибка парсинга');
            }
            
            const data = await response.json();
            
            if (data.items && data.items.length > 0) {
              // Формируем строку из распознанных операций
              const itemsStr = data.items
                .map((item: { name: string; amount: number }) => `${item.name} ${item.amount}`)
                .join(', ');
              
              setInput(prev => prev ? `${prev}, ${itemsStr}` : itemsStr);
              toast.success(`✓ Распознано: ${data.items.length} ${data.items.length === 1 ? 'операция' : 'операций'}`);
            } else if (data.total) {
              setInput(prev => prev ? `${prev}, покупка ${data.total}` : `покупка ${data.total}`);
              toast.success(`✓ Найдена сумма: ${data.total} ₽`);
            } else {
              toast.info('Не удалось найти операции в тексте');
            }
          } catch (error) {
            console.error('OCR Error:', error);
            toast.error('Ошибка распознавания');
          } finally {
            setIsProcessingOCR(false);
          }
        } else if (isPDF) {
          toast.info('PDF добавлен');
        }
      };
      reader.readAsDataURL(file);
    }
    
    // Очищаем input чтобы можно было выбрать тот же файл снова
    e.target.value = '';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU').format(amount);
  };

  // Предотвращаем закрытие во время записи или обработки
  const isProcessing = isRecording || isProcessingOCR || isGPTCategorizing;

  return (
    <Dialog open={open} onOpenChange={isProcessing ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" preventClose={isProcessing}>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            {editTransaction ? 'Редактировать' : 'Новая операция'}
            {parsedItems.length > 1 && (
              <Badge variant="secondary" className="ml-2">
                {parsedItems.length} шт.
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Тип операции */}
          <Tabs value={type} onValueChange={(v) => setType(v as TransactionType)}>
            <TabsList className="grid w-full grid-cols-2 h-11">
              <TabsTrigger
                value="expense"
                className="data-[state=active]:bg-rose-500 data-[state=active]:text-white"
              >
                Расход
              </TabsTrigger>
              <TabsTrigger
                value="income"
                className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
              >
                Доход
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Категория по умолчанию */}
          <div className="space-y-2">
            <Label>Категория по умолчанию <span className="text-zinc-400 font-normal">(необязательно)</span></Label>
            <Select value={defaultCategoryId || 'none'} onValueChange={(v) => setDefaultCategoryId(v === 'none' ? '' : v)}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Без категории" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <span>📁</span>
                    <span>Без категории</span>
                  </div>
                </SelectItem>
                {filteredCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Универсальный ввод */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Что и сколько?
              {isRecording && (
                <span className="flex items-center gap-1 text-rose-500 text-xs font-normal">
                  <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                  запись...
                </span>
              )}
              {!isRecording && (
                <span className="text-zinc-400 font-normal text-xs">
                  (можно несколько через запятую)
                </span>
              )}
            </Label>
            <div className="relative">
              <Textarea
                placeholder="Молоко 120, бензин 1500&#10;&#10;или голосом: молоко сто двадцать рублей"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className={cn(
                  "min-h-[100px] text-base transition-all",
                  isRecording && "border-rose-300 ring-2 ring-rose-100 bg-rose-50/30"
                )}
                disabled={isRecording}
              />
              {isRecording && interimText && (
                <div className="absolute bottom-2 left-3 right-3 text-xs text-rose-400 truncate">
                  слышу: {interimText}
                </div>
              )}
            </div>
          </div>

          {/* Распознанные операции */}
          {parsedItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-emerald-600 font-medium">
                  ✓ Распознано: {parsedItems.length} {parsedItems.length === 1 ? 'операция' : parsedItems.length < 5 ? 'операции' : 'операций'}
                </Label>
                <div className="flex items-center gap-2">
                  {openaiApiKey && parsedItems.some(item => !item.categoryId) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={runGPTCategorization}
                      disabled={isGPTCategorizing}
                      className="h-7 text-xs gap-1.5 text-violet-600 border-violet-200 hover:bg-violet-50"
                    >
                      {isGPTCategorizing ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      GPT
                    </Button>
                  )}
                  <Badge className="bg-zinc-900 text-white px-3">
                    Итого: {formatCurrency(getTotalAmount())} ₽
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {parsedItems.map((item, index) => {
                  const itemCategory = filteredCategories.find(c => c.id === item.categoryId);
                  const hasCategory = !!item.categoryId;
                  
                  return (
                    <div 
                      key={item.id} 
                      className={cn(
                        "p-3 rounded-xl border transition-colors",
                        hasCategory 
                          ? "bg-emerald-50/50 border-emerald-200" 
                          : "bg-zinc-50 border-zinc-200"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-zinc-400 text-sm font-medium w-6">{index + 1}.</span>
                        <Input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItemDescription(item.id, e.target.value)}
                          className="flex-1 h-9 font-medium bg-white"
                          placeholder="Описание"
                        />
                        <Input
                          type="number"
                          value={item.amount || ''}
                          onChange={(e) => updateItemAmount(item.id, e.target.value)}
                          className="w-24 h-9 text-right font-mono bg-white"
                          placeholder="0"
                        />
                        <span className="text-zinc-400 text-sm">₽</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          className="h-9 w-9 shrink-0 hover:bg-rose-100"
                        >
                          <Trash2 className="h-4 w-4 text-rose-500" />
                        </Button>
                      </div>
                      
                      {/* Категория для каждой операции */}
                      <div className="flex items-center gap-2 pl-8">
                        <Select 
                          value={item.categoryId || 'none'} 
                          onValueChange={(value) => updateItemCategory(item.id, value === 'none' ? '' : value)}
                        >
                          <SelectTrigger className="h-8 text-sm flex-1 bg-white">
                            <SelectValue placeholder="Без категории" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              <div className="flex items-center gap-2 text-zinc-500">
                                <span>📁</span>
                                <span>Без категории</span>
                              </div>
                            </SelectItem>
                            {filteredCategories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                <div className="flex items-center gap-2">
                                  <span>{cat.icon}</span>
                                  <span>{cat.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {hasCategory && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {itemCategory?.icon} {itemCategory?.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
            </div>
          )}

          {/* Дата */}
          <div className="space-y-2">
            <Label>Дата</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start h-11">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, 'd MMMM yyyy', { locale: ru })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  locale={ru}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Голосовой ввод */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={isRecording ? 'default' : 'outline'}
              className={cn(
                "flex-1 h-12 transition-all",
                isRecording && "bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/30"
              )}
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
            >
              <Mic className={cn(
                "h-5 w-5 mr-2",
                isRecording && "animate-pulse"
              )} />
              {isRecording ? "Запись..." : "Голос"}
            </Button>
          </div>

          {/* Фото и файлы */}
          <div className="space-y-2">
            <Label className="text-zinc-500 text-xs">Прикрепить фото или файл</Label>
            <div className="flex gap-2">
              {/* Фото */}
              <label
                htmlFor="photo-input"
                className={cn(
                  "flex-1 h-11 flex items-center justify-center gap-2 rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors",
                  isProcessingOCR && "opacity-50 pointer-events-none"
                )}
              >
                <input
                  ref={photoInputRef}
                  id="photo-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  disabled={isProcessingOCR}
                  className="sr-only"
                />
                {isProcessingOCR ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Обработка...
                  </>
                ) : (
                  <>
                    <Image className="h-4 w-4" />
                    Фото
                  </>
                )}
              </label>
              
              {/* Файл */}
              <label
                htmlFor="file-input"
                className={cn(
                  "flex-1 h-11 flex items-center justify-center gap-2 rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors",
                  isProcessingOCR && "opacity-50 pointer-events-none"
                )}
              >
                <input
                  ref={fileInputRef}
                  id="file-input"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.webp,image/*"
                  multiple
                  onChange={handleFileSelect}
                  disabled={isProcessingOCR}
                  className="sr-only"
                />
                <Paperclip className="h-4 w-4" />
                Файл
              </label>
            </div>
          </div>

          {/* Прикреплённые файлы */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <Label className="text-zinc-500 text-xs">Прикреплено: {attachments.length}</Label>
              <div className="flex gap-2 flex-wrap">
                {attachments.map((url, idx) => {
                  const isPDF = url.startsWith('data:application/pdf');
                  const isDoc = url.includes('application/') && !isPDF;
                  
                  return (
                    <div key={idx} className="relative group">
                      {isPDF || isDoc ? (
                        <div className="w-16 h-16 rounded-lg border bg-zinc-100 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-zinc-500" />
                        </div>
                      ) : (
                        <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border" />
                      )}
                      <button
                        type="button"
                        onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={parsedItems.length === 0}
            className={cn(
              "min-w-[120px]",
              type === 'income' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'
            )}
          >
            {parsedItems.length > 1 
              ? `Добавить ${parsedItems.length} шт.` 
              : editTransaction 
                ? 'Сохранить' 
                : 'Добавить'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}









