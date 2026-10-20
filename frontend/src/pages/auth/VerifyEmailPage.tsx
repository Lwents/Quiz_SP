import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Logo } from '../../components/Logo';

export function VerifyEmailPage() {
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') || '');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    // Remove the token from browser history; no token is sent until confirmation.
    if (token) window.history.replaceState(null, '', window.location.pathname);
  }, [token]);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const response = token
        ? await apiClient.post('/auth/verify-email', { token })
        : await apiClient.post('/auth/resend-verification', { email });
      setMessage(response.data.message);
      if (token) setVerified(true);
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      setMessage(typeof detail === 'string' ? detail : 'Không xử lý được yêu cầu. Vui lòng thử lại.');
    } finally { setBusy(false); }
  }
  return <div className="min-h-dvh flex items-center justify-center px-4 py-12">
    <div className="w-full max-w-md space-y-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
      <Logo size="lg" /><h1 className="text-2xl font-bold">Xác minh email</h1>
      {!verified && <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-600">{token ? 'Bấm nút dưới đây để xác minh tài khoản của bạn.' : 'Nhập email đăng ký để nhận lại link xác minh. Mỗi link có hiệu lực 24 giờ.'}</p>
        {!token && <label className="block text-sm font-semibold">Email<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3" /></label>}
        <button disabled={busy} className="w-full rounded-xl bg-blue-600 p-3 font-semibold text-white disabled:opacity-60">{busy ? 'Đang xử lý…' : token ? 'Xác minh email' : 'Gửi lại link xác minh'}</button>
      </form>}
      {message && <p role="status" className="rounded-xl bg-slate-50 p-3 text-sm">{message}</p>}
      {token && !verified && <Link to="/verify-email" reloadDocument className="block text-sm text-blue-600">Yêu cầu link mới</Link>}
      <Link to="/login" className="block font-semibold text-blue-600">Về trang đăng nhập</Link>
    </div>
  </div>;
}
