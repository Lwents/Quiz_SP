import { toast as sonner, type ExternalToast } from 'sonner';

// Keep the existing call signature while using the same toast system as Editor.
function options(message: string, title?: string, duration?: number): ExternalToast {
  return { description: title ? message : undefined, duration: duration === 0 ? Infinity : duration };
}
export const toast = {
  success: (message: string, title?: string, duration?: number) => sonner.success(title || message, options(message, title, duration)),
  error: (message: string, title?: string, duration = 5000) => sonner.error(title || message, options(message, title, duration)),
  warning: (message: string, title?: string, duration?: number) => sonner.warning(title || message, options(message, title, duration)),
  info: (message: string, title?: string, duration?: number) => sonner.info(title || message, options(message, title, duration)),
  dismiss: (id?: string | number) => sonner.dismiss(id),
};
