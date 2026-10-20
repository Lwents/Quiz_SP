import axios from 'axios';

const messages: Record<string, string> = {
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu chưa chính xác. Vui lòng kiểm tra lại.',
  INACTIVE_USER: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.',
  EMAIL_NOT_VERIFIED: 'Hãy xác minh email trước khi đăng nhập. Bạn có thể yêu cầu gửi lại link.',
  EMAIL_EXISTS: 'Email đã được đăng ký. Bạn có thể đăng nhập hoặc yêu cầu gửi lại link xác minh.',
  INVALID_REFRESH_TOKEN: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
};

export function authErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;
  if (!error.response) return 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.';
  const detail = error.response.data?.detail;
  const code = detail?.error?.code;
  if (code && messages[code]) return messages[code];
  if (error.response.status === 401) return messages.INVALID_CREDENTIALS;
  if (error.response.status === 422) return 'Thông tin chưa hợp lệ. Vui lòng kiểm tra các trường đã nhập.';
  if (error.response.status === 429) return typeof detail === 'string' && /[À-ỹ]/.test(detail) ? detail : 'Bạn đã thử quá nhiều lần. Vui lòng chờ một lát rồi thử lại.';
  const text = typeof detail === 'string' ? detail : detail?.error?.message;
  if (error.response.status >= 500 && !(typeof text === 'string' && /[À-ỹ]/.test(text))) return 'Máy chủ chưa xử lý được yêu cầu. Vui lòng thử lại sau.';
  return typeof text === 'string' && /[À-ỹ]/.test(text) ? text : fallback;
}
