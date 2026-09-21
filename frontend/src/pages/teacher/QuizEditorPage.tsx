import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Quiz, BaseQuestion, QuestionType, DifficultyLevel, QuizStatus } from '../../types';
import { getQuestionEditor } from '../../features/question/question-editor-registry';
import { ArrowLeft, Save, Plus, Trash2, ArrowUp, ArrowDown, Check, Eye } from 'lucide-react';

export const QuizEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [passScore, setPassScore] = useState(5.0);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('MEDIUM');
  const [status, setStatus] = useState<QuizStatus>('DRAFT');
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleAnswers, setShuffleAnswers] = useState(false);
  const [showAnswerAfterSubmit, setShowAnswerAfterSubmit] = useState(true);

  const [questions, setQuestions] = useState<BaseQuestion[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  // New question modal state
  const [editingQuestion, setEditingQuestion] = useState<BaseQuestion | null>(null);

  useEffect(() => {
    if (!isNew && id) {
      fetchQuizDetail(id);
    }
  }, [id]);

  const fetchQuizDetail = async (quizId: string) => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/quizzes/${quizId}`);
      const data: Quiz = res.data;
      setTitle(data.title);
      setDescription(data.description || '');
      setDurationMinutes(data.duration_minutes);
      setPassScore(data.pass_score);
      setDifficulty(data.difficulty);
      setStatus(data.status);
      setShuffleQuestions(data.shuffle_questions);
      setShuffleAnswers(data.shuffle_answers);
      setShowAnswerAfterSubmit(data.show_answer_after_submit);
      setQuestions(data.questions || []);
    } catch (err) {
      console.error('Error loading quiz:', err);
      alert('Không thể tải bài thi');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuiz = async () => {
    if (!title.trim()) {
      alert('Vui lòng nhập tiêu đề bài thi');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title,
        description,
        duration_minutes: Number(durationMinutes),
        pass_score: Number(passScore),
        difficulty,
        status,
        shuffle_questions: shuffleQuestions,
        shuffle_answers: shuffleAnswers,
        show_answer_after_submit: showAnswerAfterSubmit,
      };

      if (isNew) {
        const res = await apiClient.post('/quizzes', payload);
        alert('Tạo bài thi thành công!');
        navigate(`/teacher/quizzes/${res.data.id}/edit`);
      } else {
        await apiClient.patch(`/quizzes/${id}`, payload);
        alert('Cập nhật bài thi thành công!');
      }
    } catch (err: any) {
      alert(err.response?.data?.detail?.error?.message || 'Có lỗi khi lưu bài thi');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateOrUpdateQuestion = async (qData: Partial<BaseQuestion>) => {
    if (!id || isNew) {
      alert('Vui lòng lưu bài kiểm tra trước khi thêm câu hỏi!');
      return;
    }

    try {
      if (editingQuestion && editingQuestion.id && !editingQuestion.id.startsWith('new_')) {
        // Update existing question
        const res = await apiClient.patch(`/questions/${editingQuestion.id}`, qData);
        setQuestions((prev) => prev.map((q) => (q.id === editingQuestion.id ? res.data : q)));
      } else {
        // Create new question & link to quiz
        const res = await apiClient.post('/questions', qData);
        await apiClient.post(`/quizzes/${id}/questions/${res.data.id}`);
        setQuestions((prev) => [...prev, res.data]);
      }
      setEditingQuestion(null);
    } catch (err) {
      alert('Có lỗi khi lưu câu hỏi');
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('Xóa câu hỏi này khỏi đề thi?')) return;
    try {
      await apiClient.delete(`/quizzes/${id}/questions/${qId}`);
      setQuestions((prev) => prev.filter((q) => q.id !== qId));
    } catch (err) {
      alert('Không thể xóa câu hỏi');
    }
  };

  const moveQuestion = async (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= questions.length || !id) return;
    const reordered = [...questions];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setQuestions(reordered);

    try {
      await apiClient.put(`/quizzes/${id}/questions/reorder`, reordered.map((q) => q.id));
    } catch (err) {
      console.error('Failed to sync reorder:', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm text-slate-500 font-medium">Đang tải chi tiết đề thi...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/teacher')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {isNew ? 'Soạn đề thi mới' : `Chỉnh sửa: ${title}`}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Thiết lập thông số bài thi, thêm và sắp xếp câu hỏi</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isNew && (
            <button
              type="button"
              onClick={() => navigate(`/practice/${id}`)}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-sm rounded-xl transition flex items-center gap-2 cursor-pointer"
            >
              <Eye className="w-4 h-4" /> Xem trước
            </button>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={handleSaveQuiz}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition shadow-xs flex items-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            <Save className="w-4 h-4" /> {saving ? 'Đang lưu...' : 'Lưu bài thi'}
          </button>
        </div>
      </div>

      {/* Quiz Settings Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">1. Thông tin chung</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
              Tiêu đề bài thi *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
              placeholder="Ví dụ: Quiz 1.2 _ Chương 1: Tương đương logic, vị ngữ, lượng tử..."
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
              Mô tả bài thi
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              placeholder="Nhập ghi chú hoặc mô tả phạm vi kiến thức kiểm tra..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
              Thời gian làm bài (Phút)
            </label>
            <input
              type="number"
              min={0}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full px-4 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <span className="text-xs text-slate-400 mt-1 block">0 = Không giới hạn thời gian</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
              Điểm để qua môn (Thang 10)
            </label>
            <input
              type="number"
              step="0.5"
              value={passScore}
              onChange={(e) => setPassScore(Number(e.target.value))}
              className="w-full px-4 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
              Độ khó bài thi
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
              className="w-full px-4 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="EASY">Dễ (Easy)</option>
              <option value="MEDIUM">Trung bình (Medium)</option>
              <option value="HARD">Nâng cao (Hard)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
              Trạng thái xuất bản
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as QuizStatus)}
              className="w-full px-4 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-blue-700"
            >
              <option value="DRAFT">Bản nháp (DRAFT - Học sinh chưa thấy)</option>
              <option value="PUBLISHED">Xuất bản (PUBLISHED - Cho phép học sinh làm)</option>
              <option value="ARCHIVED">Lưu trữ (ARCHIVED)</option>
            </select>
          </div>
        </div>

        {/* Checkbox Options */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs font-medium text-slate-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={shuffleQuestions}
              onChange={(e) => setShuffleQuestions(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600"
            />
            <span>Xáo trộn thứ tự câu hỏi</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={shuffleAnswers}
              onChange={(e) => setShuffleAnswers(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600"
            />
            <span>Xáo trộn các đáp án</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showAnswerAfterSubmit}
              onChange={(e) => setShowAnswerAfterSubmit(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600"
            />
            <span>Hiện đáp án sau khi nộp</span>
          </label>
        </div>
      </div>

      {/* Questions Management Card */}
      {!isNew && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">2. Ngân hàng câu hỏi trong đề ({questions.length} câu)</h2>
              <p className="text-xs text-slate-500">Dùng các nút mũi tên để thay đổi thứ tự câu hỏi khi hiển thị</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setEditingQuestion({
                  id: `new_${Date.now()}`,
                  type: 'single_choice',
                  title: '',
                  content: '',
                  points: 1.0,
                  difficulty: 'MEDIUM',
                  config: { options: [{ id: 'a', text: '' }, { id: 'b', text: '' }], correct: 'a' },
                })
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-xl transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Thêm câu hỏi mới
            </button>
          </div>

          {questions.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
              Đề thi chưa có câu hỏi nào. Nhấn "+ Thêm câu hỏi mới" để bắt đầu soạn câu hỏi.
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="flex items-start justify-between p-4 bg-slate-50/70 border border-slate-200 rounded-xl hover:bg-white hover:border-slate-300 transition-all shadow-xs gap-4"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 uppercase">
                          {q.type}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">{q.points} điểm</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 line-clamp-2">{q.content}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveQuestion(idx, idx - 1)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                      title="Di chuyển lên"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === questions.length - 1}
                      onClick={() => moveQuestion(idx, idx + 1)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                      title="Di chuyển xuống"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingQuestion(q)}
                      className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                      title="Xóa khỏi đề"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Question Form Editor */}
      {editingQuestion && (
        <QuestionModal
          initialData={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSave={handleCreateOrUpdateQuestion}
        />
      )}
    </div>
  );
};

interface QuestionModalProps {
  initialData: BaseQuestion;
  onClose: () => void;
  onSave: (q: Partial<BaseQuestion>) => void;
}

const QuestionModal: React.FC<QuestionModalProps> = ({ initialData, onClose, onSave }) => {
  const [type, setType] = useState<QuestionType>(initialData.type || 'single_choice');
  const [content, setContent] = useState(initialData.content || '');
  const [points, setPoints] = useState(initialData.points || 1.0);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(initialData.difficulty || 'MEDIUM');
  const [explanation, setExplanation] = useState(initialData.explanation || '');
  const [config, setConfig] = useState<Record<string, any>>(initialData.config || {});

  const EditorComponent = getQuestionEditor(type);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      alert('Vui lòng nhập nội dung câu hỏi');
      return;
    }
    onSave({
      type,
      content,
      points: Number(points),
      difficulty,
      explanation,
      config,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">
            {initialData.id.startsWith('new_') ? 'Thêm câu hỏi mới' : 'Chỉnh sửa câu hỏi'}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                Loại câu hỏi
              </label>
              <select
                value={type}
                onChange={(e) => {
                  const newType = e.target.value as QuestionType;
                  setType(newType);
                  // Reset default config for new type
                  if (newType === 'multiple_choice') {
                    setConfig({ options: [{ id: 'a', text: '' }, { id: 'b', text: '' }], correct: ['a'] });
                  } else if (newType === 'fill_blank' || newType === 'short_answer') {
                    setConfig({ accepted_answers: [''] });
                  } else if (newType === 'matching' || newType === 'drag_drop') {
                    setConfig({ pairs: [{ left: '', right: '' }] });
                  } else if (newType === 'ordering') {
                    setConfig({ correct_order: ['Mục 1', 'Mục 2', 'Mục 3'] });
                  } else {
                    setConfig({ options: [{ id: 'a', text: '' }, { id: 'b', text: '' }], correct: 'a' });
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="single_choice">Single Choice (Chọn 1)</option>
                <option value="multiple_choice">Multiple Choice (Chọn nhiều)</option>
                <option value="true_false">True / False (Đúng/Sai)</option>
                <option value="fill_blank">Fill In The Blank (Điền khuyết)</option>
                <option value="matching">Matching (Ghép nối cột)</option>
                <option value="ordering">Ordering (Sắp xếp thứ tự)</option>
                <option value="numeric">Numeric (Tính toán số)</option>
                <option value="short_answer">Short Answer (Câu trả lời ngắn)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                Điểm số
              </label>
              <input
                type="number"
                step="0.5"
                min={0.5}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
              Nội dung câu hỏi *
            </label>
            <textarea
              rows={3}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
              placeholder="Nhập nội dung câu hỏi hoặc công thức logic..."
            />
          </div>

          {/* Dynamic Question Config Editor */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            {EditorComponent && <EditorComponent config={config} onChange={setConfig} />}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
              Lời giải thích chi tiết (Hiển thị sau khi thi xong)
            </label>
            <textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="w-full px-4 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              placeholder="Giải thích vì sao đáp án đó là chính xác..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition shadow-xs cursor-pointer"
            >
              Lưu câu hỏi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
