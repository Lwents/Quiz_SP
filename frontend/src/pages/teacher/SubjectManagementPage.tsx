import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Subject, Topic, LessonSimple, Quiz } from '../../types';
import { toast } from '../../stores/toastStore';
import {
  Plus,
  BookOpen,
  Trash2,
  Edit3,
  FolderPlus,
  ArrowLeft,
  Layers,
  X,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Eye,
  Video,
  Clock,
  CheckCircle2,
  FileCheck2,
  ExternalLink,
  FileText,
  Sparkles,
} from 'lucide-react';

export const SubjectManagementPage: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topicsMap, setTopicsMap] = useState<Record<string, Topic[]>>({});
  const [loading, setLoading] = useState(true);

  // Modal create/edit subject
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectDesc, setSubjectDesc] = useState('');

  // Inline add topic state
  const [activeSubjectForTopic, setActiveSubjectForTopic] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');

  // Modal edit topic state
  const [showEditTopicModal, setShowEditTopicModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<{ subjectId: string; topic: Topic } | null>(null);
  const [editTopicName, setEditTopicName] = useState('');
  const [editTopicDesc, setEditTopicDesc] = useState('');

  // Drag and drop state
  const [draggedTopic, setDraggedTopic] = useState<{ subjectId: string; index: number } | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState<string | null>(null);
  const [pendingOrders, setPendingOrders] = useState<Record<string, Topic[]>>({});

  // Lessons management modal state
  const [activeTopicForLessons, setActiveTopicForLessons] = useState<{ subject: Subject; topic: Topic } | null>(null);
  const [topicLessons, setTopicLessons] = useState<LessonSimple[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  const [isEditingLesson, setIsEditingLesson] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDesc, setLessonDesc] = useState('');
  const [lessonDuration, setLessonDuration] = useState(15);
  const [lessonVideo, setLessonVideo] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [lessonQuizId, setLessonQuizId] = useState('');

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/subjects');
      setSubjects(res.data);

      // Fetch topics for each subject
      const topicsData: Record<string, Topic[]> = {};
      await Promise.all(
        res.data.map(async (sub: Subject) => {
          try {
            const tRes = await apiClient.get(`/subjects/${sub.id}/topics`);
            topicsData[sub.id] = tRes.data;
          } catch {
            topicsData[sub.id] = [];
          }
        })
      );
      setTopicsMap(topicsData);
    } catch (err) {
      console.error('Error fetching subjects:', err);
      toast.error('Không thể tải danh sách môn học');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSubjectModal = (sub?: Subject) => {
    if (sub) {
      setEditingSubject(sub);
      setSubjectName(sub.name);
      setSubjectCode(sub.code);
      setSubjectDesc(sub.description || '');
    } else {
      setEditingSubject(null);
      setSubjectName('');
      setSubjectCode('');
      setSubjectDesc('');
    }
    setShowSubjectModal(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim() || !subjectCode.trim()) {
      toast.warning('Vui lòng nhập tên môn học và mã môn học');
      return;
    }

    try {
      if (editingSubject) {
        await apiClient.put(`/subjects/${editingSubject.id}`, {
          name: subjectName.trim(),
          code: subjectCode.trim(),
          description: subjectDesc.trim() || undefined,
        });
        toast.success('Đã cập nhật môn học!');
      } else {
        await apiClient.post('/subjects', {
          name: subjectName.trim(),
          code: subjectCode.trim(),
          description: subjectDesc.trim() || undefined,
        });
        toast.success('Đã tạo môn học mới!');
      }
      setShowSubjectModal(false);
      fetchSubjects();
    } catch (err: any) {
      toast.error(err.response?.data?.detail?.error?.message || 'Có lỗi khi lưu môn học');
    }
  };

  const handleDeleteSubject = async (subId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa môn học này cùng tất cả chủ đề liên quan?')) return;
    try {
      await apiClient.delete(`/subjects/${subId}`);
      toast.success('Đã xóa môn học');
      fetchSubjects();
    } catch (err: any) {
      toast.error(err.response?.data?.detail?.error?.message || 'Không thể xóa môn học');
    }
  };

  const handleAddTopic = async (subjectId: string) => {
    if (!newTopicName.trim()) return;
    try {
      await apiClient.post(`/subjects/${subjectId}/topics`, {
        name: newTopicName.trim(),
        description: newTopicDesc.trim() || undefined,
        subject_id: subjectId,
      });
      toast.success('Đã thêm chủ đề mới!');
      setNewTopicName('');
      setNewTopicDesc('');
      setActiveSubjectForTopic(null);

      // Refresh topics for this subject
      const tRes = await apiClient.get(`/subjects/${subjectId}/topics`);
      setTopicsMap((prev) => ({ ...prev, [subjectId]: tRes.data }));
    } catch (err: any) {
      toast.error(err.response?.data?.detail?.error?.message || 'Không thể tạo chủ đề');
    }
  };

  // Open edit topic modal
  const handleOpenEditTopicModal = (subjectId: string, topic: Topic) => {
    setEditingTopic({ subjectId, topic });
    setEditTopicName(topic.name);
    setEditTopicDesc(topic.description || '');
    setShowEditTopicModal(true);
  };

  const handleSaveEditTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTopic || !editTopicName.trim()) {
      toast.warning('Vui lòng nhập tên chủ đề');
      return;
    }
    try {
      await apiClient.put(`/subjects/${editingTopic.subjectId}/topics/${editingTopic.topic.id}`, {
        name: editTopicName.trim(),
        description: editTopicDesc.trim() || undefined,
      });
      toast.success('Cập nhật chủ đề thành công!');
      setShowEditTopicModal(false);
      const tRes = await apiClient.get(`/subjects/${editingTopic.subjectId}/topics`);
      setTopicsMap((prev) => ({ ...prev, [editingTopic.subjectId]: tRes.data }));
    } catch (err: any) {
      toast.error(err.response?.data?.detail?.error?.message || 'Không thể cập nhật chủ đề');
    }
  };

  const handleDeleteTopic = async (subjectId: string, topicId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa chủ đề này?')) return;
    try {
      await apiClient.delete(`/subjects/${subjectId}/topics/${topicId}`);
      toast.success('Đã xóa chủ đề');
      const tRes = await apiClient.get(`/subjects/${subjectId}/topics`);
      setTopicsMap((prev) => ({ ...prev, [subjectId]: tRes.data }));
    } catch (err: any) {
      toast.error(err.response?.data?.detail?.error?.message || 'Không thể xóa chủ đề');
    }
  };

  // Open lesson management modal
  const handleOpenLessonModal = async (subject: Subject, topic: Topic) => {
    setActiveTopicForLessons({ subject, topic });
    setIsEditingLesson(false);
    setEditingLessonId(null);
    setLoadingLessons(true);
    try {
      const [curRes, qRes] = await Promise.all([
        apiClient.get(`/lessons/subject/${subject.id}`),
        apiClient.get('/quizzes', { params: { subject_id: subject.id } }).catch(() => ({ data: [] })),
      ]);
      const curTopic = curRes.data.topics?.find((t: any) => t.id === topic.id);
      setTopicLessons(curTopic?.lessons || []);
      setAvailableQuizzes(qRes.data || []);
    } catch (err) {
      console.error('Error fetching lessons:', err);
      setTopicLessons([]);
    } finally {
      setLoadingLessons(false);
    }
  };

  const handleStartNewLesson = () => {
    setIsEditingLesson(true);
    setEditingLessonId(null);
    setLessonTitle('');
    setLessonDesc('');
    setLessonDuration(15);
    setLessonVideo('');
    setLessonContent('# Nội dung bài giảng\n\nNhập lý thuyết, định lý và ví dụ...');
    setLessonQuizId('');
  };

  const handleStartEditLesson = async (les: LessonSimple) => {
    setIsEditingLesson(true);
    setEditingLessonId(les.id);
    setLessonTitle(les.title);
    setLessonDesc(les.description || '');
    setLessonDuration(les.duration_minutes || 15);
    setLessonVideo(les.video_url || '');
    setLessonQuizId(les.quiz_id || '');

    try {
      const detailRes = await apiClient.get(`/lessons/${les.id}`);
      setLessonContent(detailRes.data.content || '');
    } catch {
      setLessonContent('');
    }
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTopicForLessons || !lessonTitle.trim() || !lessonContent.trim()) {
      toast.warning('Vui lòng điền tiêu đề bài học và nội dung bài giảng');
      return;
    }

    try {
      const payload: any = {
        title: lessonTitle.trim(),
        description: lessonDesc.trim() || undefined,
        duration_minutes: Number(lessonDuration) || 15,
        video_url: lessonVideo.trim() || undefined,
        content: lessonContent,
        quiz_id: lessonQuizId ? lessonQuizId : null,
      };

      if (editingLessonId) {
        await apiClient.put(`/lessons/${editingLessonId}`, payload);
        toast.success('Đã cập nhật bài học!');
      } else {
        await apiClient.post(`/lessons/topic/${activeTopicForLessons.topic.id}`, payload);
        toast.success('Đã thêm bài học mới thành công!');
      }

      // Refresh lessons
      const curRes = await apiClient.get(`/lessons/subject/${activeTopicForLessons.subject.id}`);
      const curTopic = curRes.data.topics?.find((t: any) => t.id === activeTopicForLessons.topic.id);
      setTopicLessons(curTopic?.lessons || []);
      setIsEditingLesson(false);
      setEditingLessonId(null);
    } catch (err: any) {
      toast.error(err.response?.data?.detail?.error?.message || 'Có lỗi khi lưu bài học');
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bài học này?')) return;
    try {
      await apiClient.delete(`/lessons/${lessonId}`);
      toast.success('Đã xóa bài học');
      if (activeTopicForLessons) {
        const curRes = await apiClient.get(`/lessons/subject/${activeTopicForLessons.subject.id}`);
        const curTopic = curRes.data.topics?.find((t: any) => t.id === activeTopicForLessons.topic.id);
        setTopicLessons(curTopic?.lessons || []);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail?.error?.message || 'Không thể xóa bài học');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, subjectId: string, index: number) => {
    setDraggedTopic({ subjectId, index });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${subjectId}:${index}`);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedTopic(null);
    setDragOverIndex(null);
  };

  const handleDrop = async (subjectId: string, dropIndex: number) => {
    if (!draggedTopic || draggedTopic.subjectId !== subjectId) {
      handleDragEnd();
      return;
    }

    const fromIndex = draggedTopic.index;
    if (fromIndex === dropIndex) {
      handleDragEnd();
      return;
    }

    const activeList = [...(pendingOrders[subjectId] || topicsMap[subjectId] || [])];
    const [movedTopic] = activeList.splice(fromIndex, 1);
    activeList.splice(dropIndex, 0, movedTopic);

    setPendingOrders((prev) => ({ ...prev, [subjectId]: activeList }));
    handleDragEnd();
    toast.info('Đã thay đổi vị trí. Nhấn "Lưu thay đổi" để xác nhận lưu thứ tự!');
  };

  // Button move up / down handler
  const handleMoveTopic = (subjectId: string, currentIndex: number, direction: 'up' | 'down') => {
    const activeList = [...(pendingOrders[subjectId] || topicsMap[subjectId] || [])];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= activeList.length) return;

    const temp = activeList[currentIndex];
    activeList[currentIndex] = activeList[targetIndex];
    activeList[targetIndex] = temp;

    setPendingOrders((prev) => ({ ...prev, [subjectId]: activeList }));
    toast.info('Đã thay đổi vị trí. Nhấn "Lưu thay đổi" để xác nhận lưu thứ tự!');
  };

  const handleSaveOrder = async (subjectId: string) => {
    const newOrder = pendingOrders[subjectId];
    if (!newOrder) return;

    setIsReordering(subjectId);
    try {
      await apiClient.put(`/subjects/${subjectId}/topics/reorder`, {
        topic_ids: newOrder.map((t) => t.id),
      });
      setTopicsMap((prev) => ({ ...prev, [subjectId]: newOrder }));
      setPendingOrders((prev) => {
        const next = { ...prev };
        delete next[subjectId];
        return next;
      });
      toast.success('Đã lưu thứ tự các chương học thành công!');
    } catch (err) {
      toast.error('Không thể lưu thứ tự chủ đề');
    } finally {
      setIsReordering(null);
    }
  };

  const handleCancelOrder = (subjectId: string) => {
    setPendingOrders((prev) => {
      const next = { ...prev };
      delete next[subjectId];
      return next;
    });
    toast.info('Đã hủy thay đổi thứ tự');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm text-slate-500 font-medium">Đang tải danh mục môn học...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            to="/teacher"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
            title="Về trang quản trị đề thi"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quản lý Môn học & Chủ đề (Courses & Topics)</h1>
            <p className="text-sm text-slate-500 mt-0.5">Tạo các môn học nền tảng, phân loại chủ đề và quản lý bài học trước khi tạo bài thi</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleOpenSubjectModal()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Thêm môn học mới
          </button>
        </div>
      </div>

      {/* Navigation tabs for Teacher */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-sm font-semibold">
        <Link
          to="/teacher"
          className="px-4 py-2.5 text-slate-500 hover:text-slate-800 transition flex items-center gap-2"
        >
          <BookOpen className="w-4 h-4" /> Quản lý Đề thi (Quizzes)
        </Link>
        <Link
          to="/teacher/subjects"
          className="px-4 py-2.5 text-blue-600 border-b-2 border-blue-600 font-bold transition flex items-center gap-2"
        >
          <Layers className="w-4 h-4" /> Quản lý Môn học & Chủ đề (Subjects)
        </Link>
      </div>

      {/* Subjects Grid */}
      {subjects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">Chưa có môn học nào</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">Hãy tạo môn học đầu tiên để bắt đầu xây dựng bài kiểm tra và bài giảng</p>
          <button
            type="button"
            onClick={() => handleOpenSubjectModal()}
            className="px-4 py-2 bg-blue-600 text-white font-semibold text-sm rounded-xl cursor-pointer"
          >
            + Tạo môn học ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {subjects.map((sub) => {
            const topics = pendingOrders[sub.id] || topicsMap[sub.id] || [];
            const hasChanges = Boolean(pendingOrders[sub.id]);
            const isAddingTopic = activeSubjectForTopic === sub.id;
            const isSavingThisSubject = isReordering === sub.id;

            return (
              <div
                key={sub.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-5"
              >
                <div>
                  {/* Subject Header */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded bg-blue-100 text-blue-700">
                          {sub.code}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">{topics.length} chủ đề</span>
                        {isSavingThisSubject && (
                          <span className="text-[11px] text-blue-600 font-medium animate-pulse">
                            Đang lưu thứ tự...
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">{sub.name}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/courses/${sub.id}`}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition flex items-center gap-1.5 border border-blue-200 shadow-2xs cursor-pointer"
                        title="Xem trước khóa học dưới góc nhìn học viên"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>Xem như học viên</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleOpenSubjectModal(sub)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                        title="Chỉnh sửa thông tin môn học"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSubject(sub.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                        title="Xóa môn học"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {sub.description && (
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">{sub.description}</p>
                  )}

                  {/* Topics List */}
                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-blue-600" /> Các chủ đề / chương học:
                        </span>
                        {topics.length > 1 && (
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            Kéo thả hoặc dùng mũi tên để sắp xếp thứ tự
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {hasChanges && (
                          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg animate-in fade-in">
                            <span className="text-[11px] text-amber-800 font-medium hidden sm:inline">Chưa lưu:</span>
                            <button
                              type="button"
                              onClick={() => handleCancelOrder(sub.id)}
                              className="px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 rounded transition cursor-pointer"
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              disabled={isSavingThisSubject}
                              onClick={() => handleSaveOrder(sub.id)}
                              className="px-2.5 py-0.5 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition flex items-center gap-1 shadow-2xs cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{isSavingThisSubject ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                            </button>
                          </div>
                        )}
                        {!isAddingTopic && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSubjectForTopic(sub.id);
                              setNewTopicName('');
                              setNewTopicDesc('');
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Thêm chủ đề
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline Add Topic Box */}
                    {isAddingTopic && (
                      <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl space-y-2 mt-2">
                        <input
                          type="text"
                          value={newTopicName}
                          onChange={(e) => setNewTopicName(e.target.value)}
                          placeholder="Tên chương / chủ đề mới (ví dụ: Chương 1: Đạo hàm)..."
                          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                          autoFocus
                        />
                        <input
                          type="text"
                          value={newTopicDesc}
                          onChange={(e) => setNewTopicDesc(e.target.value)}
                          placeholder="Mô tả tóm tắt nội dung chủ đề (tùy chọn)..."
                          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveSubjectForTopic(null)}
                            className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddTopic(sub.id)}
                            className="px-3 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition cursor-pointer"
                          >
                            Tạo chủ đề
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Topic List Drag & Drop */}
                    {topics.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">
                        Chưa có chủ đề nào. Bấm "Thêm chủ đề" để bắt đầu phân chương.
                      </p>
                    ) : (
                      <div className="space-y-1.5 mt-2">
                        {topics.map((top, idx) => {
                          const isCurrentlyDragged =
                            draggedTopic?.subjectId === sub.id && draggedTopic?.index === idx;
                          const isDragTarget =
                            draggedTopic?.subjectId === sub.id && dragOverIndex === idx;

                          return (
                            <div
                              key={top.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, sub.id, idx)}
                              onDragOver={(e) => handleDragOver(e, idx)}
                              onDrop={() => handleDrop(sub.id, idx)}
                              onDragEnd={handleDragEnd}
                              className={`group flex items-center justify-between p-2 rounded-xl border transition select-none cursor-grab active:cursor-grabbing ${
                                isCurrentlyDragged
                                  ? 'opacity-30 bg-blue-50 border-dashed border-blue-400'
                                  : isDragTarget
                                  ? 'border-blue-500 bg-blue-50/90 shadow-sm scale-[1.01]'
                                  : 'bg-slate-50 hover:bg-slate-100/90 border-slate-200/60 hover:border-slate-300'
                              }`}
                              title="Kéo thả để sắp xếp lại vị trí chương"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                                {/* Grip Drag Handle */}
                                <span
                                  className="text-slate-400 group-hover:text-slate-600 p-0.5 rounded cursor-grab active:cursor-grabbing"
                                  title="Giữ và kéo để sắp xếp"
                                >
                                  <GripVertical className="w-3.5 h-3.5" />
                                </span>

                                {/* Numerical Badge */}
                                <span className="w-5 h-5 rounded-full bg-slate-200 group-hover:bg-blue-100 group-hover:text-blue-700 text-slate-600 font-bold flex items-center justify-center text-[10px] shrink-0 transition">
                                  {idx + 1}
                                </span>

                                {/* Topic Name and Description */}
                                <div className="min-w-0 flex-1">
                                  <span className="font-semibold text-slate-800 text-xs truncate block">
                                    {top.name}
                                  </span>
                                  {top.description && (
                                    <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                                      {top.description}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Controls: Move Up, Move Down, Manage Lessons, Edit, Delete */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveTopic(sub.id, idx, 'up');
                                  }}
                                  className="text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:hover:text-slate-400 p-1 rounded hover:bg-slate-200 transition cursor-pointer"
                                  title="Chuyển lên trên"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === topics.length - 1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveTopic(sub.id, idx, 'down');
                                  }}
                                  className="text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:hover:text-slate-400 p-1 rounded hover:bg-slate-200 transition cursor-pointer"
                                  title="Chuyển xuống dưới"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenLessonModal(sub, top);
                                  }}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded transition cursor-pointer"
                                  title="Quản lý bài giảng & đề thi của chủ đề này"
                                >
                                  <BookOpen className="w-3 h-3" />
                                  <span>Bài học</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditTopicModal(sub.id, top);
                                  }}
                                  className="text-slate-400 hover:text-amber-600 p-1 rounded hover:bg-amber-50 transition cursor-pointer"
                                  title="Chỉnh sửa chủ đề"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTopic(sub.id, top.id);
                                  }}
                                  className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition ml-0.5 cursor-pointer"
                                  title="Xóa chủ đề"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Link: Tạo đề thi cho môn này */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Tạo đề thi gán môn này</span>
                  <Link
                    to={`/teacher/quizzes/new?subject_id=${sub.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs rounded-xl transition cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" /> + Tạo đề thi cho môn này
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tạo/Sửa Môn học */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingSubject ? 'Chỉnh sửa môn học' : 'Thêm môn học mới'}
              </h3>
              <button
                type="button"
                onClick={() => setShowSubjectModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                  Mã môn học *
                </label>
                <input
                  type="text"
                  required
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  placeholder="Nhập mã môn học (ví dụ: MATH12, PHYS11)..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                  Tên môn học *
                </label>
                <input
                  type="text"
                  required
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="Nhập tên môn học (ví dụ: Toán học 12)..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                  Mô tả tổng quan môn học
                </label>
                <textarea
                  rows={3}
                  value={subjectDesc}
                  onChange={(e) => setSubjectDesc(e.target.value)}
                  placeholder="Nhập giới thiệu tóm tắt về môn học..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition shadow-xs cursor-pointer"
                >
                  {editingSubject ? 'Lưu cập nhật' : 'Tạo môn học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chỉnh sửa Chủ đề */}
      {showEditTopicModal && editingTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Chỉnh sửa chủ đề</h3>
              <button
                type="button"
                onClick={() => setShowEditTopicModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditTopic} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                  Tên chủ đề / chương học *
                </label>
                <input
                  type="text"
                  required
                  value={editTopicName}
                  onChange={(e) => setEditTopicName(e.target.value)}
                  placeholder="Nhập tên chủ đề..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                  Mô tả tóm tắt nội dung chủ đề
                </label>
                <textarea
                  rows={3}
                  value={editTopicDesc}
                  onChange={(e) => setEditTopicDesc(e.target.value)}
                  placeholder="Mô tả nội dung chương / chủ đề..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditTopicModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition shadow-xs cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Quản lý Bài học & Gắn đề thi (Course Lessons & Quizzes) */}
      {activeTopicForLessons && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                    {activeTopicForLessons.subject.code}
                  </span>
                  <span className="text-xs text-slate-500">Chủ đề:</span>
                  <span className="text-xs font-bold text-slate-700">{activeTopicForLessons.topic.name}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {isEditingLesson
                    ? editingLessonId
                      ? 'Chỉnh sửa bài học'
                      : 'Thêm bài học mới'
                    : 'Quản lý bài giảng & Đề thi đánh giá'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTopicForLessons(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {!isEditingLesson ? (
                /* View: List of Lessons in Topic */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Danh sách bài giảng ({topicLessons.length})
                      </h4>
                      <p className="text-xs text-slate-500">
                        Các bài học lý thuyết học sinh sẽ học trước khi làm bài tập đánh giá
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleStartNewLesson}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm bài học mới
                    </button>
                  </div>

                  {loadingLessons ? (
                    <div className="py-12 text-center">
                      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-xs text-slate-400">Đang tải danh sách bài học...</p>
                    </div>
                  ) : topicLessons.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-700">Chưa có bài học nào trong chủ đề này</p>
                      <p className="text-xs text-slate-400 mt-1 mb-4">
                        Bấm nút bên dưới để tạo bài giảng lý thuyết đầu tiên
                      </p>
                      <button
                        type="button"
                        onClick={handleStartNewLesson}
                        className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 cursor-pointer"
                      >
                        + Tạo bài giảng ngay
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {topicLessons.map((les, idx) => {
                        const matchedQuiz = availableQuizzes.find((q) => q.id === les.quiz_id);
                        return (
                          <div
                            key={les.id}
                            className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                          >
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <div className="space-y-1 min-w-0 flex-1">
                                <h5 className="font-semibold text-sm text-slate-900 truncate">
                                  {les.title}
                                </h5>
                                {les.description && (
                                  <p className="text-xs text-slate-500 line-clamp-1">
                                    {les.description}
                                  </p>
                                )}
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    {les.duration_minutes || 15} phút
                                  </span>
                                  {les.video_url && (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-medium">
                                      <Video className="w-3 h-3 text-blue-500" /> Có video
                                    </span>
                                  )}
                                  {les.quiz_id ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-medium">
                                      <FileCheck2 className="w-3 h-3 text-emerald-600" /> Đề thi: {matchedQuiz?.title || 'Đã liên kết đề thi'}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-slate-400 italic">
                                      Chưa gắn đề thi
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                              <a
                                href={`/lessons/${les.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                title="Xem bài giảng ở tab mới"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleStartEditLesson(les)}
                                className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                title="Chỉnh sửa bài học"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLesson(les.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                title="Xóa bài học"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* View: Create/Edit Lesson Form */
                <form onSubmit={handleSaveLesson} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                      Tiêu đề bài giảng *
                    </label>
                    <input
                      type="text"
                      required
                      value={lessonTitle}
                      onChange={(e) => setLessonTitle(e.target.value)}
                      placeholder="Nhập tiêu đề bài học (ví dụ: Quy tắc tính đạo hàm căn bản)..."
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                      Tóm tắt bài học (Mô tả ngắn)
                    </label>
                    <input
                      type="text"
                      value={lessonDesc}
                      onChange={(e) => setLessonDesc(e.target.value)}
                      placeholder="Mô tả mục tiêu đầu ra của bài học này..."
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                        Thời lượng học ước tính (phút)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={180}
                        value={lessonDuration}
                        onChange={(e) => setLessonDuration(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                        Đường dẫn Video bài giảng (YouTube URL)
                      </label>
                      <input
                        type="url"
                        value={lessonVideo}
                        onChange={(e) => setLessonVideo(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Gắn Đề thi đánh giá (Quiz liên kết)
                      </label>
                      <span className="text-[11px] text-slate-400">Chọn hoặc hủy gắn đề thi</span>
                    </div>
                    <select
                      value={lessonQuizId}
                      onChange={(e) => setLessonQuizId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">-- Không gắn đề thi đánh giá --</option>
                      {availableQuizzes.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.title} ({q.difficulty} - {q.duration_minutes} phút - {q.question_count || 0} câu)
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Khi học sinh học xong lý thuyết, hệ thống sẽ đề xuất làm bài thi đánh giá được gắn ở đây.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Nội dung bài giảng (Markdown & KaTeX Toán học) *
                      </label>
                      <span className="text-[11px] text-slate-400 font-mono">
                        $x^2$ hoặc $$y = f(x)$$
                      </span>
                    </div>
                    <textarea
                      rows={10}
                      required
                      value={lessonContent}
                      onChange={(e) => setLessonContent(e.target.value)}
                      placeholder="# Tiêu đề bài học&#10;&#10;Nội dung lý thuyết, công thức định lý..."
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Hỗ trợ đầy đủ định dạng Markdown (đề mục, bảng biểu, danh sách) và KaTeX cho công thức toán học.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsEditingLesson(false)}
                      className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    >
                      Quay lại danh sách
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition shadow-xs cursor-pointer"
                    >
                      {editingLessonId ? 'Lưu thay đổi bài học' : 'Tạo bài học mới'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
