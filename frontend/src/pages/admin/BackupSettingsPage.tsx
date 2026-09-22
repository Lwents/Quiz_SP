import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, FileJson, Upload, AlertTriangle, Database, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { toast } from '../../stores/toastStore';

type BackupSummary = {
  format: string;
  version: number;
  created_at: string;
  checksum: string;
  counts: Record<string, number>;
};

const tableLabels: Record<string, string> = {
  users: 'Tài khoản',
  subjects: 'Môn học',
  topics: 'Chủ đề',
  lessons: 'Bài học',
  questions: 'Câu hỏi',
  quizzes: 'Đề thi',
  quiz_questions: 'Câu hỏi trong đề',
  attempts: 'Lượt làm bài',
  attempt_answers: 'Câu trả lời',
  user_lesson_progress: 'Tiến độ bài học',
};

const errorMessage = (error: any, fallback: string) => {
  const detail = error?.response?.data?.detail;
  return typeof detail === 'string' ? detail : detail?.error?.message || fallback;
};

export const BackupSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<BackupSummary | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState<'export' | 'preview' | 'restore' | null>(null);

  const downloadBackup = async () => {
    setBusy('export');
    try {
      const response = await apiClient.get('/backups/export', { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `quiz-sp-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Đã tải bản sao lưu xuống máy');
    } catch (error) {
      toast.error(errorMessage(error, 'Không thể tạo bản sao lưu'));
    } finally {
      setBusy(null);
    }
  };

  const previewBackup = async () => {
    if (!file) return;
    setBusy('preview');
    setPreview(null);
    setConfirmation('');
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await apiClient.post<BackupSummary>('/backups/preview', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(response.data);
      toast.success('Tệp sao lưu hợp lệ');
    } catch (error) {
      toast.error(errorMessage(error, 'Không thể đọc tệp sao lưu'));
    } finally {
      setBusy(null);
    }
  };

  const restoreBackup = async () => {
    if (!file || !preview || confirmation.trim().toUpperCase() !== 'KHOI PHUC') return;
    setBusy('restore');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('confirmation', 'REPLACE');
      await apiClient.post('/backups/restore', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      logout();
      navigate('/login', { replace: true });
      toast.success('Đã khôi phục dữ liệu. Vui lòng đăng nhập bằng tài khoản trong bản sao lưu.');
    } catch (error) {
      toast.error(errorMessage(error, 'Không thể khôi phục dữ liệu; dữ liệu hiện tại vẫn được giữ nguyên'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Database className="w-6 h-6 text-blue-600" /> Cấu hình sao lưu dữ liệu
        </h1>
        <p className="text-slate-600 mt-2">Chuyển dữ liệu giữa các bản cài đặt Quiz_SP bằng một tệp JSON.</p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <p>Tệp sao lưu chứa thông tin tài khoản, bài làm và mã băm mật khẩu. Hãy giữ tệp riêng tư. Tệp không chứa cấu hình `.env` hay các tệp ngoài được dẫn bằng URL.</p>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Download className="w-5 h-5 text-blue-600" /> Xuất bản sao lưu</h2>
        <p className="text-sm text-slate-600">Tải toàn bộ dữ liệu hiện tại để cất giữ hoặc mang sang máy khác.</p>
        <button type="button" disabled={busy !== null} onClick={downloadBackup}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-white font-semibold hover:bg-blue-700 disabled:opacity-50">
          {busy === 'export' ? 'Đang tạo tệp...' : 'Tải bản sao lưu'}
        </button>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Upload className="w-5 h-5 text-blue-600" /> Nhập và khôi phục</h2>
        <p className="text-sm text-slate-600">Chọn tệp từ máy cũ, kiểm tra nội dung rồi xác nhận khôi phục trên máy này. Dữ liệu hiện có ở máy này sẽ được thay thế hoàn toàn.</p>
        <label className="block space-y-2 text-sm font-medium text-slate-700">
          <span>Tệp sao lưu (.json, tối đa 50 MB)</span>
          <input type="file" accept=".json,application/json" className="block w-full rounded-lg border border-slate-300 p-2"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setPreview(null);
              setConfirmation('');
            }} />
        </label>
        {file && <div className="text-sm text-slate-600 flex items-center gap-2"><FileJson className="w-4 h-4" /> {file.name}</div>}
        <button type="button" disabled={!file || busy !== null} onClick={previewBackup}
          className="rounded-lg border border-blue-600 px-4 py-2.5 text-blue-700 font-semibold hover:bg-blue-50 disabled:opacity-50">
          {busy === 'preview' ? 'Đang kiểm tra...' : 'Xem trước bản sao lưu'}
        </button>

        {preview && (
          <div className="border-t border-slate-200 pt-5 space-y-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-600" /> Bản sao lưu hợp lệ</h3>
            <p className="text-sm text-slate-600">Tạo lúc {new Date(preview.created_at).toLocaleString('vi-VN')} · Phiên bản {preview.version}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {Object.entries(preview.counts).map(([name, count]) => (
                <div key={name} className="rounded-lg bg-slate-50 px-3 py-2 border border-slate-200">
                  <span className="text-slate-600">{tableLabels[name] ?? name}</span>
                  <span className="block text-lg font-bold text-slate-900">{count}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-red-800">Hãy tải bản sao lưu của máy này trước khi thay thế nếu bạn cần giữ dữ liệu cũ.</p>
              <label className="block text-sm text-slate-700 space-y-1">
                <span>Nhập <strong>KHOI PHUC</strong> để xác nhận thay thế toàn bộ dữ liệu:</span>
                <input type="text" value={confirmation} onChange={(event) => setConfirmation(event.target.value)}
                  autoComplete="off" className="block w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
              <button type="button" onClick={restoreBackup}
                disabled={busy !== null || confirmation.trim().toUpperCase() !== 'KHOI PHUC'}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-white font-semibold hover:bg-red-700 disabled:opacity-50">
                {busy === 'restore' ? 'Đang khôi phục...' : 'Khôi phục và thay thế dữ liệu'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
