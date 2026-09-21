import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const newToast: ToastItem = {
      ...toast,
      id,
      duration: toast.duration ?? 4000,
    };
    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));
    return id;
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  clearToasts: () => set({ toasts: [] }),
}));

// Convenient helper functions callable from anywhere (inside or outside components)
export const toast = {
  success: (message: string, title?: string, duration?: number) => {
    return useToastStore.getState().addToast({
      type: 'success',
      title: title || 'Thành công',
      message,
      duration,
    });
  },
  error: (message: string, title?: string, duration?: number) => {
    return useToastStore.getState().addToast({
      type: 'error',
      title: title || 'Đã có lỗi xảy ra',
      message,
      duration: duration ?? 5000,
    });
  },
  warning: (message: string, title?: string, duration?: number) => {
    return useToastStore.getState().addToast({
      type: 'warning',
      title: title || 'Cảnh báo',
      message,
      duration,
    });
  },
  info: (message: string, title?: string, duration?: number) => {
    return useToastStore.getState().addToast({
      type: 'info',
      title: title || 'Thông báo',
      message,
      duration,
    });
  },
  dismiss: (id: string) => {
    useToastStore.getState().removeToast(id);
  },
};
