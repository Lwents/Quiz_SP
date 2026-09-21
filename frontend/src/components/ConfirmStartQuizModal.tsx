import React from 'react';
import {
  Clock,
  Award,
  AlertTriangle,
  BookOpen,
  X,
  Play,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';

export interface ConfirmQuizInfo {
  id: string;
  title: string;
  duration_minutes: number;
  pass_score?: number;
  question_count?: number;
  isInProgress?: boolean;
}

interface ConfirmStartQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  quiz: ConfirmQuizInfo | null;
}

export const ConfirmStartQuizModal: React.FC<ConfirmStartQuizModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  quiz,
}) => {
  if (!isOpen || !quiz) return null;

  const duration = quiz.duration_minutes || 0;
  const passScore = quiz.pass_score ?? 5.0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
              quiz.isInProgress ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {quiz.isInProgress ? <Play className="w-6 h-6 fill-amber-600" /> : <Clock className="w-6 h-6" />}
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 block">
                {quiz.isInProgress ? 'Tiếp tục bài kiểm tra' : 'Xác nhận bắt đầu thi'}
              </span>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                {quiz.title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Key Quiz Specs Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100/80 flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">Thời gian làm bài</span>
                <span className="text-sm sm:text-base font-extrabold text-blue-900">
                  {duration > 0 ? `${duration} phút` : 'Tự do'}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100/80 flex items-center gap-3">
              <Award className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">Điểm đạt tối thiểu</span>
                <span className="text-sm sm:text-base font-extrabold text-emerald-900">
                  {passScore} / 10 điểm
                </span>
              </div>
            </div>
          </div>

          {/* Warning / Rule box */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 space-y-2 text-xs sm:text-sm text-amber-950">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Quy chế tính giờ & Làm bài thi</span>
            </div>
            <ul className="space-y-1.5 text-xs text-amber-900/90 leading-relaxed pl-1">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                <span>
                  Đồng hồ sẽ <strong>bắt đầu đếm ngược ngay lập tức {duration > 0 ? `trong vòng ${duration} phút` : ''}</strong> ngay sau khi bạn bấm xác nhận.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                <span>
                  Thời gian thi <strong>không thể tạm dừng</strong>. Nếu bạn đóng tab hoặc rời khỏi trang, đồng hồ vẫn tiếp tục tính giờ theo thời gian thực.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                <span>
                  Khi hết thời gian quy định, hệ thống sẽ <strong>tự động thu và nộp bài</strong> với những câu hỏi bạn đã chọn.
                </span>
              </li>
            </ul>
          </div>

          <p className="text-xs text-slate-600 text-center font-medium">
            Bạn đã sẵn sàng và bố trí đủ thời gian làm bài chưa?
          </p>
        </div>

        {/* Modal Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs sm:text-sm transition cursor-pointer"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md transition flex items-center gap-2 cursor-pointer ${
              quiz.isInProgress
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
            }`}
          >
            {quiz.isInProgress ? (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Tiếp tục làm bài thi</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Bắt đầu làm bài thi ngay</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
