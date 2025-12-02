'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface AuthStore {
  user: User | null;
  users: User[]; // Stored users (email -> password hash simulation)
  passwords: { [email: string]: string };
  isAuthenticated: boolean;
  isLoading: boolean;
  
  register: (email: string, password: string, name: string) => { success: boolean; error?: string };
  login: (email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      users: [],
      passwords: {},
      isAuthenticated: false,
      isLoading: true,
      
      register: (email, password, name) => {
        const { users, passwords } = get();
        
        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return { success: false, error: 'Некорректный email' };
        }
        
        // Validate password
        if (password.length < 6) {
          return { success: false, error: 'Пароль должен быть не менее 6 символов' };
        }
        
        // Validate name
        if (name.trim().length < 2) {
          return { success: false, error: 'Введите ваше имя' };
        }
        
        // Check if user exists
        if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
          return { success: false, error: 'Пользователь с таким email уже существует' };
        }
        
        const newUser: User = {
          id: Date.now().toString(),
          email: email.toLowerCase(),
          name: name.trim(),
          createdAt: new Date().toISOString(),
        };
        
        set({
          users: [...users, newUser],
          passwords: { ...passwords, [email.toLowerCase()]: password },
          user: newUser,
          isAuthenticated: true,
          isLoading: false,
        });
        
        return { success: true };
      },
      
      login: (email, password) => {
        const { users, passwords } = get();
        
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (!user) {
          return { success: false, error: 'Пользователь не найден' };
        }
        
        if (passwords[email.toLowerCase()] !== password) {
          return { success: false, error: 'Неверный пароль' };
        }
        
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
        
        return { success: true };
      },
      
      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },
      
      setLoading: (loading) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setLoading(false);
        }
      },
    }
  )
);







