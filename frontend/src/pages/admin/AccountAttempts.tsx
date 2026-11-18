import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ClockPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from '../../stores/toastStore';
import { apiClient } from '../../api/client';
import { AdminDialog } from '../../components/AdminDialog';
import { dateTime, type Account } from './adminTypes';

type Row = { id: string; quiz_title: string; status: string; score: number; max_score: number; percentage: number; started_at: string; submitted_at: string | null; timed: boolean; extra_minutes: number };
export function AccountAttempts({ account, onClose }: { account: Account; onClose: () => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => { sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, []);
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ total: number; items: Row[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [selectedAttempt, setSelectedAttempt] = useState<Row | null>(null);
  const [minutesInput, setMinutesInput] = useState('5');
  const [extensionError, setExtensionError] = useState('');
  const [extending, setExtending] = useState(false);

  function openExtension(row: Row) {
    setSelectedAttempt(row);
    setMinutesInput('5');
    setExtensionError('');
  }

  async function extendAttempt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAttempt || extending) return;
    const attemptId = selectedAttempt.id;
    const input = minutesInput.trim();
    const minutes = Number(input);
    if (!/^\d+$/.test(input) || minutes < 1 || minutes > 1440) {
      setExtensionError('Nhập số phút nguyên từ 1 đến 1440.');
      return;
    }
    setExtensionError('');
    setExtending(true);
    try {
      const response = await apiClient.post<{ extra_minutes: number }>(
        `/users/admin/${account.id}/attempts/${attemptId}/extend`,
        { minutes },
      );
      setData((current) => current && {
        ...current,
        items: current.items.map((row) =>
          row.id === attemptId ? { ...row, extra_minutes: response.data.extra_minutes } : row),
      });
      setSelectedAttempt(null);
      toast.success(`Đã cộng thêm ${minutes} phút.`);
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      setExtensionError(typeof detail === 'string' ? detail : 'Không thể gia hạn lượt làm bài. Vui lòng thử lại.');
    } finally {
      setExtending(false);
    }
  }
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    apiClient.get(`/users/admin/${account.id}/attempts`, { params: { limit: 20, offset: page * 20 } })
      .then((response) => { if (active) setData(response.data); })
      .catch(() => { if (active) setError('Không tải được lịch sử bài làm.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [account.id, page, retry]);
  return <section ref={sectionRef} style={{ scrollMarginTop: 100 }} className="rounded-2xl border border-blue-200 bg-white p-5 space-y-4" aria-label="Lịch sử bài làm của tài khoản">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold">Bài làm của {account.full_name}</h3><p className="break-all text-sm text-slate-500">{account.email}</p></div><button type="button" onClick={onClose} className="rounded-lg border px-3 py-2 text-sm">Đóng lịch sử</button></header>
    {loading ? <p role="status">Đang tải bài làm…</p> : error ? <div role="alert">{error} <button onClick={() => setRetry((n) => n + 1)} className="text-blue-600 underline">Thử lại</button></div> : <>
      <p className="text-sm text-slate-500">{data?.total ?? 0} lượt làm bài</p>
      {!data?.items.length ? <p>Tài khoản chưa có bài làm nào.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-3">Bài thi</th><th className="p-3">Trạng thái</th><th className="p-3">Điểm</th><th className="p-3">Bắt đầu / Nộp bài</th><th className="p-3">Chi tiết</th></tr></thead><tbody>{data.items.map((row) => <tr key={row.id} className="border-b"><td className="p-3 min-w-48 font-semibold">{row.quiz_title}</td><td className="p-3">{row.status === 'IN_PROGRESS' ? 'Đang làm' : row.status === 'GRADED' ? 'Đã chấm' : 'Đã nộp'}</td><td className="p-3 whitespace-nowrap">{row.status === 'IN_PROGRESS' ? 'Chưa chấm' : `${row.score} / ${row.max_score} (${row.percentage}%)`}</td><td className="p-3 whitespace-nowrap">{dateTime(row.started_at)}<br />{row.submitted_at ? dateTime(row.submitted_at) : 'Chưa nộp'}</td><td className="p-3">{row.status === 'IN_PROGRESS' && row.timed && <div className="min-w-28">
        <button type="button" onClick={() => openExtension(row)} className="font-semibold text-blue-600">Gia hạn</button>
        {row.extra_minutes > 0 && <p className="text-xs text-slate-500">Thời lượng tăng {row.extra_minutes} phút</p>}
      </div>}{row.status !== 'IN_PROGRESS' && <Link className="font-semibold text-blue-600" to={`/results/${row.id}`}>Xem bài</Link>}</td></tr>)}</tbody></table></div>}
      <div className="flex justify-end gap-3"><button disabled={page === 0} onClick={() => setPage((n) => n - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Trước</button><span className="py-2">Trang {page + 1}</span><button disabled={(page + 1) * 20 >= (data?.total ?? 0)} onClick={() => setPage((n) => n + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Sau</button></div>
    </>}
    {selectedAttempt && (
      <AdminDialog title="Gia hạn thời gian làm bài" busy={extending} onClose={() => setSelectedAttempt(null)}>
        <form onSubmit={extendAttempt} noValidate className="space-y-5">
          <header className="flex items-start gap-3">
            <div className="shrink-0 rounded-xl bg-blue-50 p-2.5 text-blue-600">
              <ClockPlus className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Gia hạn thời gian làm bài</h3>
            </div>
          </header>
          <dl className="space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
            <div>
              <dt className="text-slate-500">Học sinh</dt>
              <dd className="font-medium break-words">{account.full_name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Bài thi</dt>
              <dd className="font-medium break-words">{selectedAttempt.quiz_title}</dd>
            </div>
          </dl>
          <div>
            <label htmlFor="extension-minutes" className="block text-sm font-semibold">Số phút cộng thêm</label>
            <input
              id="extension-minutes"
              type="number"
              inputMode="numeric"
              min={1}
              max={1440}
              step={1}
              required
              value={minutesInput}
              disabled={extending}
              onChange={(event) => {
                setMinutesInput(event.target.value);
                setExtensionError('');
              }}
              aria-describedby="extension-minutes-help"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-50"
            />
            <p id="extension-minutes-help" className="mt-1.5 text-xs text-slate-500">Từ 1 đến 1440 phút.</p>
            {extensionError && <p role="alert" className="mt-2 text-sm text-red-700">{extensionError}</p>}
          </div>
          <footer className="flex justify-end gap-2">
            <button type="button" disabled={extending} onClick={() => setSelectedAttempt(null)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50">Hủy</button>
            <button type="submit" disabled={extending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {extending ? 'Đang gia hạn…' : 'Xác nhận gia hạn'}
            </button>
          </footer>
        </form>
      </AdminDialog>
    )}
  </section>;
}
