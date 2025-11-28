import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  username: string;
  email: string;
  nativeLanguage: string;
  targetLanguage: string;
  learningLanguages: Array<{
    code: string;
    name: string;
    order: number;
  }>;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateLanguageSettings: (settings: {
    nativeLanguage: string;
    targetLanguage: string;
    learningLanguages: Array<{
      code: string;
      name: string;
      order: number;
    }>;
  }) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,

      login: async (username: string, password: string) => {
        // 模拟登录API调用
        try {
          // 这里应该调用真实的API
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // 模拟用户数据
          const user: User = {
            id: '1',
            username,
            email: `${username}@example.com`,
            nativeLanguage: '',
            targetLanguage: '',
            learningLanguages: []
          };

          set({ isAuthenticated: true, user });
          return true;
        } catch (error) {
          console.error('Login failed:', error);
          return false;
        }
      },

      logout: () => {
        set({ isAuthenticated: false, user: null });
      },

      updateLanguageSettings: (settings) => {
        const { user } = get();
        if (user) {
          set({
            user: {
              ...user,
              ...settings
            }
          });
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user
      })
    }
  )
);
