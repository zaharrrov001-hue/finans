export type TransactionType = 'income' | 'expense';
export type AccountType = 'personal' | 'business';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  accountType: AccountType | 'both'; // 'both' for income that can be used in both
}

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  categoryId: string;
  type: TransactionType;
  accountType: AccountType;
  date: Date;
  attachments: Attachment[];
  createdAt: Date;
}

export interface Attachment {
  id: string;
  type: 'image' | 'receipt';
  url: string;
  ocrText?: string;
}

export interface FinanceStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  byCategory: {
    categoryId: string;
    total: number;
  }[];
}

// Telegram User
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}





