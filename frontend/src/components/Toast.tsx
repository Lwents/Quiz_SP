import { Toaster } from 'sonner';

/** Match Editor's compact, stacked notifications, with room on phone screens. */
export function ToastContainer() {
  return <Toaster theme="light" position="bottom-right" offset={20} expand={false}
    mobileOffset={{ left: 16, right: 16, bottom: 'calc(16px + env(safe-area-inset-bottom))' }}
    containerAriaLabel="Thông báo"
    richColors closeButton visibleToasts={3}
    toastOptions={{ classNames: { toast: 'quiz-toast', description: 'quiz-toast-description' } }} />;
}
