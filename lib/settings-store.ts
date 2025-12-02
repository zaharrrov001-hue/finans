import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const DEFAULT_API_KEY = '';

interface SettingsStore {
  openaiApiKey: string;
  autoCategorizationEnabled: boolean;
  
  setOpenaiApiKey: (key: string) => void;
  setAutoCategorizationEnabled: (enabled: boolean) => void;
  clearApiKey: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      openaiApiKey: DEFAULT_API_KEY,
      autoCategorizationEnabled: true,
      
      setOpenaiApiKey: (key) => set({ openaiApiKey: key }),
      setAutoCategorizationEnabled: (enabled) => set({ autoCategorizationEnabled: enabled }),
      clearApiKey: () => set({ openaiApiKey: '' }),
    }),
    {
      name: 'finance-settings',
      version: 2, // Увеличиваем версию чтобы сбросить старые настройки
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          return {
            ...persistedState,
            openaiApiKey: '',
          };
        }
        return persistedState as SettingsStore;
      },
    }
  )
);







