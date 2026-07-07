import React, { useEffect, useState, useRef } from 'react';
import { Task, UserProfile, TaskComment, TaskStatus, TaskPriority } from '../types';
import { X, Send, Camera, Clock, Check, RefreshCw, MessageSquare, History, MapPin, Trash2, ShieldAlert, Calendar } from 'lucide-react';
import { getTaskStatusLabel, isCompletionApproved as hasCompletionApproval } from '../lib/taskState';
import { formatTaskAssigneeLabel, splitTaskAssignees, taskIncludesAssignee } from '../lib/taskAssignees';
import { readTaskImageFile, validateTaskImageFile } from '../lib/taskImage';

type ManagerActionPayload = TaskPriority | string;

interface TaskDetailModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  focusActionPanel?: boolean;
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onSubmitCompletion: (taskId: string, report: string, photoUrl?: string, remarks?: string) => void;
  onAddComment: (taskId: string, content: string) => void;
  onAttachPhoto: (taskId: string, target: 'reference' | 'completion', photoUrl: string) => void;
  onManagerAction: (
    taskId: string, 
    actionType: 'approve' | 'reject' | 'delete' | 'change_priority' | 'change_assignee',
    payload?: ManagerActionPayload
  ) => void;
  allUsers: UserProfile[];
  isSynced?: boolean;
  gcalToken?: string | null;
  onSyncSingle?: (task: Task) => void;
}

export default function TaskDetailModal({
  task,
  isOpen,
  onClose,
  currentUser,
  focusActionPanel = false,
  onUpdateStatus,
  onSubmitCompletion,
  onAddComment,
  onAttachPhoto,
  onManagerAction,
  allUsers,
  isSynced = false,
  gcalToken = null,
  onSyncSingle,
}: TaskDetailModalProps) {
  const [commentText, setCommentText] = useState('');
  const [additionalWorkText, setAdditionalWorkText] = useState('');
  const [reportText, setReportText] = useState('');
  const [reportRemarks, setReportRemarks] = useState('');
  const [completionPhoto, setCompletionPhoto] = useState<string | undefined>(undefined);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  const referenceFileInputRef = useRef<HTMLInputElement>(null);
  const completionFileInputRef = useRef<HTMLInputElement>(null);
  const reportFileInputRef = useRef<HTMLInputElement>(null);
  const actionPanelRef = useRef<HTMLDivElement>(null);
  const reportTextAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen || !focusActionPanel) return;

    const timerId = window.setTimeout(() => {
      actionPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      reportTextAreaRef.current?.focus();
    }, 120);

    return () => window.clearTimeout(timerId);
  }, [focusActionPanel, isOpen, task.id]);

  useEffect(() => {
    if (!isOpen) return;
    setReportText(task.completionReport ?? '');
    setReportRemarks(task.completionRemarks ?? '');
    setCompletionPhoto(undefined);
  }, [isOpen, task.id, task.completionReport, task.completionRemarks]);

  if (!isOpen) return null;

  const isManager = currentUser.role === '팀장';
  const isAssignee = taskIncludesAssignee(task.assignee, currentUser.name);
  const primaryAssignee = splitTaskAssignees(task.assignee)[0] || '';
  const isCompletionApproved = hasCompletionApproval(task);
  const canWorkOn = isAssignee && !isCompletionApproved;
  const canAttachPhotos = isManager || isAssignee;
  const statusLabel = getTaskStatusLabel(task);

  // Format date readable
  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.getMonth() + 1}월 ${d.getDate()}일 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(task.id, commentText.trim());
    setCommentText('');
  };

  const handleAdditionalWorkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!additionalWorkText.trim()) return;
    onAddComment(task.id, `[추가 작업] ${additionalWorkText.trim()}`);
    setAdditionalWorkText('');
  };

  const readSelectedImage = async (file: File) => {
    const imageError = validateTaskImageFile(file);
    if (imageError) throw new Error(imageError);
    return readTaskImageFile(file);
  };

  const handleReportPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsPhotoUploading(true);
    readSelectedImage(file)
      .then((url) => setCompletionPhoto(url))
      .catch((error) => alert(error instanceof Error ? error.message : '이미지를 읽지 못했습니다.'))
      .finally(() => setIsPhotoUploading(false));
  };

  const handleDirectPhotoUpload = (target: 'reference' | 'completion') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsPhotoUploading(true);
    readSelectedImage(file)
      .then((url) => onAttachPhoto(task.id, target, url))
      .catch((error) => alert(error instanceof Error ? error.message : '이미지를 읽지 못했습니다.'))
      .finally(() => setIsPhotoUploading(false));
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportText.trim()) {
      alert('완료 처리 내용 요약을 입력해 주십시오.');
      return;
    }
    onSubmitCompletion(task.id, reportText.trim(), completionPhoto, reportRemarks.trim());
    setReportText('');
    setReportRemarks('');
    setCompletionPhoto(undefined);
  };

  const assignableUsers = allUsers;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div 
        className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col my-auto text-slate-100"
        id={`task-detail-modal-${task.id}`}
      >
        {/* Header Block with Colors */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <span className="px-2.5 py-1 text-[10px] font-black rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-widest">
              업무지정
            </span>
            <span className="px-2.5 py-1 text-[10px] font-black rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              {task.category}
            </span>
            <span className={`px-2.5 py-1 text-[10px] rounded-lg font-black uppercase tracking-wider ${
              task.priority === '긴급' ? 'bg-rose-500/20 text-rose-450 border border-rose-500/30 animate-pulse' : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              {task.priority === '긴급' ? '🚨 긴급 요청됨' : task.priority}
            </span>
            <div className="flex items-center text-[10px] text-slate-500 font-mono font-black tracking-wider uppercase">
              <span>OPS ID: {task.id}</span>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Split Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 overflow-y-auto lg:overflow-hidden flex-grow select-text">
          {/* Left Column (7 cols): Info & Photos & Timeline */}
          <div className="lg:col-span-7 p-5 sm:p-6 overflow-visible lg:overflow-y-auto space-y-6 lg:border-r lg:border-slate-800 max-h-none lg:max-h-[78vh]">
            
            {/* Title & Core Details */}
            <div>
              <h2 className="text-white font-black text-lg md:text-xl tracking-tight leading-tight">{task.title}</h2>
              <div className="flex items-center mt-3.5 text-xs text-slate-400 gap-4 font-semibold uppercase tracking-wider">
                <span className="flex items-center text-slate-300">
                  <span className="mr-1.5 text-slate-500 font-black">현장 배정인원:</span>
                  <span className="bg-slate-800 border border-slate-700/60 text-slate-200 px-2 py-0.5 rounded-md font-black">{formatTaskAssigneeLabel(task.assignee)}</span>
                </span>
                <span className="flex items-center font-mono">
                  <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-500 font-medium" />
                  {formatDate(task.createdAt)} 등록
                </span>
                {task.dueDate && (
                  <span className={`flex items-center font-mono ${statusLabel === '지연' ? 'text-rose-300' : 'text-slate-400'}`}>
                    <Clock className="w-3.5 h-3.5 mr-1.5 text-current font-medium" />
                    완료 예정 {formatDate(task.dueDate)}
                  </span>
                )}
              </div>
            </div>

            {/* Description Card */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800/80 space-y-3">
              <h4 className="text-slate-500 text-[10px] font-black tracking-widest uppercase">업무지정 개요 및 처리 내용</h4>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-semibold">{task.description}</p>
              
              <div className="pt-2.5 border-t border-slate-800/60 flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                <span className="font-extrabold text-emerald-300">업무구분:</span>
                <span className="text-slate-300">{task.category}</span>
              </div>

              <div className="pt-2.5 border-t border-slate-800/60 flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="font-extrabold text-slate-400">지정 구역:</span>
                <span className="text-slate-300">{task.location}</span>
              </div>
            </div>

            {/* Photo Attachment Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Reference / Input Photo */}
              <div className="border border-slate-800/80 p-4 rounded-2xl bg-slate-950/40">
                <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-3.5 flex items-center justify-between">
                  <span>현장 접수 사진 (참조)</span>
                  {canAttachPhotos && (
                    <button
                      type="button"
                      onClick={() => referenceFileInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] hover:bg-indigo-500/20"
                    >
                      {task.photoUrl ? '사진 변경' : '사진 첨부'}
                    </button>
                  )}
                </h4>
                <input
                  ref={referenceFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleDirectPhotoUpload('reference')}
                  className="hidden"
                />
                {task.photoUrl ? (
                  <div className="relative rounded-xl overflow-hidden group border border-slate-800 shadow-xl">
                    <img 
                      src={task.photoUrl} 
                      alt="현장 접수 원본" 
                      className="w-full h-36 object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                      onClick={() => window.open(task.photoUrl)}
                    />
                    <div className="absolute bottom-1 right-1 bg-slate-900/80 backdrop-blur-xs px-2 py-0.5 rounded text-[9px] text-slate-300 font-bold">클릭시 원본보기</div>
                  </div>
                ) : (
                  <div className="h-36 border border-dashed border-slate-800 rounded-xl bg-slate-950/50 flex flex-col items-center justify-center text-slate-500 text-[10px] font-bold">
                    <span>첨부된 사전 사진이 없습니다.</span>
                    <span className="text-slate-600 mt-1 uppercase tracking-wider text-[9px]">현장 구두 묘사 참고</span>
                  </div>
                )}
              </div>

              {/* Completion Report Photo */}
              <div className="border border-slate-800/80 p-4 rounded-2xl bg-slate-950/40">
                <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-3.5 flex items-center justify-between">
                  <span>실제 완료 보고 조치 사진</span>
                  {canAttachPhotos && (
                    <button
                      type="button"
                      onClick={() => completionFileInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] hover:bg-emerald-500/20"
                    >
                      {task.completionPhotoUrl ? '사진 변경' : '사진 첨부'}
                    </button>
                  )}
                </h4>
                <input
                  ref={completionFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleDirectPhotoUpload('completion')}
                  className="hidden"
                />
                {task.completionPhotoUrl ? (
                  <div className="relative rounded-xl overflow-hidden group border border-slate-800 shadow-xl">
                    <img 
                      src={task.completionPhotoUrl} 
                      alt="업무 조치 완료" 
                      className="w-full h-36 object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                      onClick={() => window.open(task.completionPhotoUrl)}
                    />
                    <div className="absolute bottom-1 right-1 bg-slate-900/80 backdrop-blur-xs px-2 py-0.5 rounded text-[9px] text-slate-305 font-bold">클릭시 원본보기</div>
                  </div>
                ) : (
                  <div className="h-36 border border-dashed border-slate-800 rounded-xl bg-slate-950/50 flex flex-col items-center justify-center text-slate-500 text-[10px] font-bold">
                    {task.status === '완료' ? (
                      <div className="text-center px-4">
                        <Check className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                        <span className="text-emerald-400 font-extrabold uppercase tracking-wider">조치 완료 승인 심사중</span>
                        <p className="text-[9px] text-slate-600 mt-1">서류 및 증적 업로드됨</p>
                      </div>
                    ) : (
                      <div className="text-center px-2">
                        <Camera className="w-5 h-5 text-indigo-400 mx-auto mb-1 animate-pulse" />
                        <span>작업 조치 보고 대기 수급중</span>
                        <p className="text-[9px] text-slate-600 mt-1 font-semibold uppercase tracking-widest">기사 소견 작성 필요</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Completion Report Text if Available */}
            {task.completionReport && (
              <div className="bg-emerald-500/10 border border-emerald-500/25 p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-emerald-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-400" />
                    현장 최종 조치 완료 보고서
                  </h4>
                  {task.completedAt && (
                    <span className="text-[10px] text-emerald-500 font-mono font-bold">보고 송신 일시: {formatDate(task.completedAt)}</span>
                  )}
                </div>
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-semibold">{task.completionReport}</p>
                {task.completionRemarks && (
                  <div className="pt-2 border-t border-emerald-500/20">
                    <p className="text-[10px] text-amber-300 font-black mb-1">비고</p>
                    <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-semibold">{task.completionRemarks}</p>
                  </div>
                )}
              </div>
            )}

            {/* Task Event History Timeline logs */}
            <div className="space-y-3">
              <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <History className="w-4 h-4 text-indigo-400" />
                현장 변동 로그 전산 기록 (AUDIT LOGS)
              </h4>
              <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1 bg-slate-950 border border-slate-800 p-4 rounded-2xl">
                {task.history.slice().reverse().map((log) => (
                  <div key={log.id} className="flex items-start space-x-2.5 text-[10px] py-1 border-b border-slate-900/60 last:border-0 font-semibold">
                    <span className="text-slate-500 font-mono shrink-0 select-none">{formatDate(log.timestamp)}</span>
                    <span className="bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded-md shrink-0 font-black">{log.user}</span>
                    <span className="text-slate-400 leading-normal">{log.action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Actions, Live Chat Comments, and Status Manager */}
          <div className="lg:col-span-5 p-5 sm:p-6 flex flex-col max-h-none lg:max-h-[78vh] overflow-visible lg:overflow-hidden bg-slate-950/40">
            
            {/* Status Modification Panel */}
            <div className="border-b border-slate-800 pb-4 mb-4">
              <h3 className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-3 block">현장 진행 통제 센터 (COMMANDS)</h3>
              
              {/* Facility shared calendar sync action card */}
              <div className="mb-4 p-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between text-xs font-sans">
                <span className="text-slate-300 font-bold flex items-center gap-1.5 select-none">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  Google 할 일
                </span>
                {isSynced ? (
                  <span className="px-2.5 py-1 text-[9px] rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black flex items-center gap-1 select-none">
                    <Check className="w-3 h-3 text-emerald-400" />
                    전송 요청됨
                  </span>
                ) : gcalToken ? (
                  <button
                    type="button"
                    onClick={() => onSyncSingle?.(task)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-505 text-white rounded-xl text-[9px] font-black cursor-pointer shadow-md transition-all active:scale-95"
                  >
                    할 일 전송
                  </button>
                ) : (
                  <span className="text-slate-500 text-[9px] font-black select-none">웹앱 미설정</span>
                )}
              </div>

              {/* Technician Controller */}
              {canWorkOn && (
                <div ref={actionPanelRef} className="space-y-3">
                  <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs text-emerald-100 font-semibold leading-relaxed">
                    <div className="font-black text-emerald-300 mb-1">내 담당 업무입니다.</div>
                    현재 상태는 <span className="font-black text-white">{statusLabel}</span>입니다.
                    {task.status === '대기중'
                      ? ' 먼저 업무를 접수하면 작업중으로 바뀌고, 이후 완료 내용을 입력할 수 있습니다.'
                      : ' 현장에서 처리한 뒤 완료 내용을 저장하면 완료로 바뀝니다.'}
                  </div>

                  {task.status === '대기중' && (
                    <button
                      onClick={() => onUpdateStatus(task.id, '진행중')}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer transition-colors shadow-lg shadow-emerald-500/10 border border-emerald-400/30"
                    >
                      <Check className="w-4 h-4 text-white" />
                      <span>업무 접수</span>
                    </button>
                  )}

                  {/* Submission reporting Form */}
                  {(task.status === '진행중' || task.status === '완료') && (
                    <form onSubmit={handleReportSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>완료 내용 입력</span>
                        </span>
                        {task.status === '완료' && (
                          <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider">완료 내용 수정</span>
                        )}
                      </div>

                      <textarea
                        ref={reportTextAreaRef}
                        value={reportText}
                        onChange={(e) => setReportText(e.target.value)}
                        placeholder="완료한 내용, 실제 조치 결과, 남은 문제, 추가 필요 사항을 입력해 주세요."
                        className="w-full p-3 text-xs border border-slate-800 rounded-xl outline-none focus:border-indigo-400 bg-slate-950 block h-20 text-white font-semibold placeholder:text-slate-600"
                        required
                      />

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">비고</label>
                        <textarea
                          value={reportRemarks}
                          onChange={(e) => setReportRemarks(e.target.value)}
                          placeholder="유의사항, 개선사항, 검토사항, 건의사항 등을 입력해 주세요."
                          className="w-full p-3 text-xs border border-slate-800 rounded-xl outline-none focus:border-amber-400 bg-slate-950 block h-16 text-white font-semibold placeholder:text-slate-600"
                        />
                      </div>

                      {/* Photo Attachment under 완료보고 */}
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => reportFileInputRef.current?.click()}
                            className="bg-slate-800 hover:bg-slate-755 text-slate-200 border border-slate-700/60 p-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                          >
                            <Camera className="w-4 h-4 text-indigo-400" />
                            <span className="text-[10px]">조치 완료사진 업로드</span>
                          </button>
                          <input
                            ref={reportFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleReportPhotoUpload}
                            className="hidden"
                          />
                        </div>
                        {isPhotoUploading && <span className="text-[10px] text-indigo-400 animate-pulse">인코딩 보정중...</span>}
                        {completionPhoto && (
                          <div className="relative inline-block border border-slate-750 rounded overflow-hidden shadow-md">
                            <img src={completionPhoto} className="h-8 w-12 object-cover" referrerPolicy="no-referrer" />
                            <button
                              type="button"
                              onClick={() => setCompletionPhoto(undefined)}
                              className="absolute top-0 right-0 bg-rose-500 text-white rounded-full p-0.2"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-505 text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-lg border border-emerald-500/20 shadow-emerald-500/10"
                      >
                        <Send className="w-4 h-4 text-white" />
                        <span>완료 저장 및 팀장에게 보고</span>
                      </button>
                    </form>
                  )}

                  {(task.status === '진행중' || task.status === '완료') && (
                    <form onSubmit={handleAdditionalWorkSubmit} className="rounded-2xl border border-indigo-500/25 bg-indigo-500/10 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-indigo-200">추가 작업 기록</span>
                        <span className="text-[9px] text-slate-500 font-black">완료 전/후 계속 입력 가능</span>
                      </div>
                      <textarea
                        value={additionalWorkText}
                        onChange={(e) => setAdditionalWorkText(e.target.value)}
                        placeholder="추가로 확인한 작업, 후속 조치, 현장 특이사항, 남은 작업을 입력해 주세요."
                        className="w-full p-3 text-xs border border-slate-800 rounded-xl outline-none focus:border-indigo-400 bg-slate-950 block h-16 text-white font-semibold placeholder:text-slate-600"
                      />
                      <button
                        type="submit"
                        disabled={!additionalWorkText.trim()}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black text-[11px] rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>추가 작업 저장</span>
                      </button>
                    </form>
                  )}
                </div>
              )}
              {!isManager && !isAssignee && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-[10px] text-slate-400 font-bold leading-relaxed">
                  이 업무는 {formatTaskAssigneeLabel(task.assignee)} 담당 업무입니다. 의견 작성은 가능하지만 작업 개시와 완료 보고는 배정된 담당자 계정에서만 진행됩니다.
                </div>
              )}

              {/* Manager Actions Box */}
              {isManager && (
                <div className="space-y-2 mt-2">
                  <div className="bg-indigo-950/20 border border-indigo-500/20 p-4 rounded-2xl">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 block mb-2">팀장 최고승인결재 및 관리권한</span>
                    
                    {/* Approval system */}
                    {task.status === '완료' && task.completionReport && !isCompletionApproved && (
                      <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                        <button
                          onClick={() => onManagerAction(task.id, 'approve')}
                          className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-505 text-white border border-emerald-500/30 rounded-xl text-[10px] font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md"
                        >
                          <Check className="w-3.5 h-3.5" />
                          완료 조치 최종승인
                        </button>
                        <button
                          onClick={() => onManagerAction(task.id, 'reject')}
                          className="py-2 px-3.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/25 rounded-xl text-[10px] font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          보완 지시 / 반려
                        </button>
                      </div>
                    )}
                    {task.status === '완료' && task.completionReport && isCompletionApproved && (
                      <div className="mb-2.5 px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] text-emerald-300 font-black">
                        최종 승인 완료된 작업입니다.
                      </div>
                    )}

                    {/* Quick Config */}
                    <div className="grid grid-cols-2 gap-3 text-[10px] font-semibold text-slate-350 mt-1">
                      <div className="space-y-1">
                        <label className="text-slate-500 block text-[9px] uppercase font-black tracking-widest">담당자 재배정</label>
                        <select
                          value={primaryAssignee}
                          onChange={(e) => onManagerAction(task.id, 'change_assignee', e.target.value)}
                          className="w-full p-2 bg-slate-950 text-white border border-slate-800 rounded-lg outline-none font-bold"
                        >
                          {assignableUsers.map((t) => (
                            <option key={t.name} value={t.name} className="bg-slate-900">{t.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-500 block text-[9px] uppercase font-black tracking-widest">우선순위 변경</label>
                        <select
                          value={task.priority}
                          onChange={(e) => onManagerAction(task.id, 'change_priority', e.target.value as TaskPriority)}
                          className="w-full p-2 bg-slate-950 text-white border border-slate-800 rounded-lg outline-none font-bold"
                        >
                          <option value="낮음" className="bg-slate-900">낮음</option>
                          <option value="보통" className="bg-slate-900">보통</option>
                          <option value="긴급" className="bg-slate-900">긴급</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Comments Stream */}
            <div className="flex-grow flex flex-col min-h-0">
              <h3 className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-3 flex items-center gap-1.5 shrink-0 select-none">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                <span>현장 실시간 의견 교환 (오피스 토크 - {task.comments.length})</span>
              </h3>

              {/* Message loop container */}
              <div className="flex-grow overflow-y-auto space-y-3 mb-3.5 pr-1 min-h-[140px]">
                {task.comments.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 text-[10px] font-bold uppercase tracking-wider space-y-1">
                    <span>전산 전송 코멘트 내역이 없습니다.</span>
                    <span>팀원들과 기술 사양 및 사진 수급 상태를 공유받으세요.</span>
                  </div>
                ) : (
                  task.comments.map((comment) => {
                    const isSelf = comment.senderName === currentUser.name;
                    return (
                      <div 
                        key={comment.id} 
                        className={`flex flex-col max-w-[85%] ${isSelf ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                      >
                        <div className="flex items-center space-x-1.5 text-[9px] text-slate-500 mb-1">
                          <span className={`font-black ${isSelf ? 'text-indigo-400' : 'text-slate-400'}`}>{comment.senderName} ({comment.senderRole})</span>
                          <span>•</span>
                          <span className="font-mono">{formatDate(comment.timestamp)}</span>
                        </div>
                        <div className={`px-3.5 py-2 text-xs rounded-2xl font-bold leading-relaxed ${
                          isSelf 
                            ? 'bg-indigo-600 text-white rounded-tr-none shadow-md' 
                            : 'bg-slate-950 text-slate-200 rounded-tl-none border border-slate-850'
                        }`}>
                          <p className="break-all">{comment.content}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleCommentSubmit} className="flex gap-2 shrink-0 mt-auto">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="실시간 기술 의견 및 지시 피드백을 기록하세요..."
                  className="flex-grow px-3.5 py-2.5 text-xs border border-slate-800 rounded-xl outline-none focus:border-indigo-400 bg-slate-950 text-white font-semibold placeholder:text-slate-600"
                />
                <button
                  type="submit"
                  className="px-4.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl cursor-pointer flex items-center justify-center transition-colors shadow-lg shadow-indigo-500/10 border border-indigo-500/20"
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                </button>
              </form>
            </div>

            {/* Delete button for Manager */}
            {isManager && (
              <div className="mt-4 pt-3.5 border-t border-slate-800/80">
                {showConfirmDelete ? (
                  <div className="flex items-center justify-between bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl text-xs">
                    <span className="text-rose-400 font-black flex items-center gap-1.5 uppercase tracking-wide text-[10.5px]">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 animate-pulse" />
                      업무지정을 파기 조치할까요?
                    </span>
                    <div className="flex gap-1.5 font-black text-[9.5px]">
                      <button
                        onClick={() => onManagerAction(task.id, 'delete')}
                        className="px-3.5 py-1.8 bg-rose-600 text-white hover:bg-rose-500 border border-rose-500/20 rounded-xl cursor-pointer uppercase tracking-wider"
                      >
                        예, 전산 영구 삭제
                      </button>
                      <button
                        onClick={() => setShowConfirmDelete(false)}
                        className="px-3.5 py-1.8 bg-slate-800 text-slate-300 hover:text-white rounded-xl cursor-pointer uppercase tracking-wider"
                      >
                        보류 및 복귀
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowConfirmDelete(true)}
                    className="text-slate-500 hover:text-rose-400 text-[10px] font-black flex items-center justify-center gap-1.5 px-3 py-1.5 hover:bg-rose-500/10 rounded-xl w-max cursor-pointer transition-colors border border-transparent hover:border-rose-500/20 uppercase tracking-widest"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    이 업무지정 전체 파기/삭제
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
