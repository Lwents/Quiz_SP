import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from '../../stores/toastStore';
import { apiClient } from '../../api/client';
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
  const [extending, setExtending] = useState(false);

  async function extendAttempt(row: Row) {
    const input = window.prompt('Cộng thêm bao nhiêu phút cho lượt làm bài này?', '5');
    if (input === null) return;
    const minutes = Number(input);
    if (!/^\d+$/.test(input.trim()) || minutes < 1 || minutes > 1440) {
      toast.error('Nhập số phút nguyên từ 1 đến 1440.');
      return;
    }
    setExtending(true);
    try {
      await apiClient.post(`/users/admin/${account.id}/attempts/${row.id}/extend`, { minutes });
      toast.success(`Đã cộng thêm ${minutes} phút.`);
      setRetry((n) => n + 1);
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Không thể gia hạn lượt làm bài.');
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
        <button type="button" disabled={extending} onClick={() => void extendAttempt(row)} className="font-semibold text-blue-600 disabled:opacity-50">Gia hạn</button>
        {row.extra_minutes > 0 && <p className="text-xs text-slate-500">Thời lượng tăng {row.extra_minutes} phút</p>}
      </div>}{row.status !== 'IN_PROGRESS' && <Link className="font-semibold text-blue-600" to={`/results/${row.id}`}>Xem bài</Link>}</td></tr>)}</tbody></table></div>}
      <div className="flex justify-end gap-3"><button disabled={page === 0} onClick={() => setPage((n) => n - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Trước</button><span className="py-2">Trang {page + 1}</span><button disabled={(page + 1) * 20 >= (data?.total ?? 0)} onClick={() => setPage((n) => n + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Sau</button></div>
    </>}
  </section>;
}
