import { toast } from '../../stores/toastStore';
﻿import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Subject, Topic } from '../../types';
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
} from 'lucide-react';
import { LessonSimple, Quiz } from '../../types';

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

  // New topic inline input state
  const [activeSubjectForTopic, setActiveSubjectForTopic] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');

  // Drag and drop state
  const [draggedTopic, setDraggedTopic] = useState<{ subjectId: string; index: number } | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState<string | null>(null);

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
          name: subjectName,
          code: subjectCode,
          description: subjectDesc,
        });
      } else {
        await apiClient.post('/subjects', {
          name: subjectName,
          code: subjectCode,
          description: subjectDesc,
        });
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
      fetchSubjects();
    } catch (err) {
      toast.error('Không thể xóa môn học');
    }
  };

  const handleAddTopic = async (subjectId: string) => {
    if (!newTopicName.trim()) return;
    try {
      await apiClient.post(`/subjects/${subjectId}/topics`, {
        name: newTopicName,
        description: newTopicDesc,
        subject_id: subjectId,
      });
      setNewTopicName('');
      setNewTopicDesc('');
      setActiveSubjectForTopic(null);

      // Refresh topics for this subject
      const tRes = await apiClient.get(`/subjects/${subjectId}/topics`);
      setTopicsMap((prev) => ({ ...prev, [subjectId]: tRes.data }));
    } catch (err) {
      toast.error('Không thể tạo chủ đề');
    }
  };

  const handleDeleteTopic = async (subjectId: string, topicId: string) => {
    if (!confirm('Xóa chủ đề này?')) return;
    try {
      await apiClient.delete(`/subjects/${subjectId}/topics/${topicId}`);
      const tRes = await apiClient.get(`/subjects/${subjectId}/topics`);
      setTopicsMap((prev) => ({ ...prev, [subjectId]: tRes.data }));
    } catch (err) {
      toast.error('Không thể xóa chủ đề');
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
      const payload = {
        title: lessonTitle.trim(),
        description: lessonDesc.trim() || undefined,
        duration_minutes: Number(lessonDuration) || 15,
        video_url: lessonVideo.trim() || undefined,
        content: lessonContent,
        quiz_id: lessonQuizId || undefined,
      };

      if (editingLessonId) {
        await apiClient.put(`/lessons/${editingLessonId}`, payload);
      } else {
        await apiClient.post(`/lessons/topic/${activeTopicForLessons.topic.id}`, payload);
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
      if (activeTopicForLessons) {
        const curRes = await apiClient.get(`/lessons/subject/${activeTopicForLessons.subject.id}`);
        const curTopic = curRes.data.topics?.find((t: any) => t.id === activeTopicForLessons.topic.id);
        setTopicLessons(curTopic?.lessons || []);
      }
    } catch (err) {
      toast.error('Không thể xóa bài học');
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

    const currentTopics = [...(topicsMap[subjectId] || [])];
    const [movedTopic] = currentTopics.splice(fromIndex, 1);
    currentTopics.splice(dropIndex, 0, movedTopic);

    // Optimistic local update
    setTopicsMap((prev) => ({ ...prev, [subjectId]: currentTopics }));
    handleDragEnd();

    // Persist to server
    try {
      setIsReordering(subjectId);
      await apiClient.put(`/subjects/${subjectId}/topics/reorder`, {
        topic_ids: currentTopics.map((t) => t.id),
      });
    } catch (err) {
      console.error('Failed to reorder topics:', err);
      // Revert if error
      const tRes = await apiClient.get(`/subjects/${subjectId}/topics`);
      setTopicsMap((prev) => ({ ...prev, [subjectId]: tRes.data }));
      toast.error('Không thể lưu thứ tự mới cho chủ đề.');
    } finally {
      setIsReordering(null);
    }
  };

  // Button move up / down handler
  const handleMoveTopic = async (subjectId: string, currentIndex: number, direction: 'up' | 'down') => {
    const currentTopics = [...(topicsMap[subjectId] || [])];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentTopics.length) return;

    const temp = currentTopics[currentIndex];
    currentTopics[currentIndex] = currentTopics[targetIndex];
    currentTopics[targetIndex] = temp;

    // Optimistic local update
    setTopicsMap((prev) => ({ ...prev, [subjectId]: currentTopics }));

    // Persist to server
    try {
      setIsReordering(subjectId);
      await apiClient.put(`/subjects/${subjectId}/topics/reorder`, {
        topic_ids: currentTopics.map((t) => t.id),
      });
    } catch (err) {
      console.error('Failed to reorder topics:', err);
      const tRes = await apiClient.get(`/subjects/${subjectId}/topics`);
      setTopicsMap((prev) => ({ ...prev, [subjectId]: tRes.data }));
      toast.error('Không thể di chuyển chủ đề.');
    } finally {
      setIsReordering(null);
    }
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
            <p className="text-sm text-slate-500 mt-0.5">Tạo các môn học nền tảng, phân loại chủ đề trước khi tạo bài thi trắc nghiệm</p>
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
          <p className="text-sm text-slate-500 mt-1 mb-4">Hãy tạo môn học đầu tiên để bắt đầu xây dựng bài kiểm tra</p>
          <button
            type="button"
            onClick={() => handleOpenSubjectModal()}
            className="px-4 py-2 bg-blue-600 text-white font-semibold text-sm rounded-xl"
          >
            + Tạo môn học ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {subjects.map((sub) => {
            const topics = topicsMap[sub.id] || [];
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

                    {/* Inline Add Topic Box */}
                    {isAddingTopic && (
                      <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl space-y-2 mt-2">
                        <input
                          type="text"
                          required
                          value={newTopicName}
                          onChange={(e) => setNewTopicName(e.target.value)}
                          placeholder="Tên chủ đề / chương..."
                          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        />
                        <input
                          type="text"
                          value={newTopicDesc}
                          onChange={(e) => setNewTopicDesc(e.target.value)}
                          placeholder="Mô tả tóm tắt phạm vi (tùy chọn)..."
                          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        />
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setActiveSubjectForTopic(null)}
                            className="px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-200 rounded-md cursor-pointer"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddTopic(sub.id)}
                            className="px-3 py-1 text-xs bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 cursor-pointer"
                          >
                            Lưu chủ đề
                          </button>
                        </div>
                      </div>
                    )}

                    {topics.length === 0 && !isAddingTopic ? (
                      <p className="text-xs text-slate-400 italic py-2">Chưa có chủ đề nào trong môn này.</p>
                    ) : (
                      <div className="space-y-1.5 pt-1">
                        {topics.map((top, idx) => {
                          const isCurrentlyDragged =
                            draggedTopic?.subjectId === sub.id && draggedTopic?.index === idx;
                          const isDragTarget =
                            dragOverIndex === idx && draggedTopic?.subjectId === sub.id;

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

                              {/* Controls: Move Up, Move Down, Delete */}
                              <div className="flex items-center gap-0.5 shrink-0">
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
                                    handleDeleteTopic(sub.id, top.id);
                                  }}
                                  className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition ml-0.5 cursor-pointer"
                                  title="Xóa chủ đề"
                                >
                                  <X className="w-3.5 h-3.5" />
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
                  placeholder="Nhập mã môn học..."
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
                  placeholder="Nhập tên môn học..."
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
    </div>
  );
};
