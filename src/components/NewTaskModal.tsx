import React, { useState, useRef } from 'react';
import { TaskPriority, Task } from '../types';
import { X, Upload, Check, AlertCircle, CalendarClock } from 'lucide-react';
import { readTaskImageFile, validateTaskImageFile } from '../lib/taskImage';
import {
  DAILY_LOG_WORK_TYPES,
  DEFAULT_DAILY_LOG_WORK_TYPE,
  type DailyLogWorkType,
} from '../lib/dailyLogWorkTypes';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, 'id' | 'createdAt' | 'comments' | 'history' | 'status'> & { initialPhotoFile?: File }) => void;
  users: Array<{ name: string; avatar: string; specialty: string }>;
}

export default function NewTaskModal({ isOpen, onClose, onSave, users }: NewTaskModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DailyLogWorkType>(DEFAULT_DAILY_LOG_WORK_TYPE);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('보통');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('17:00');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const setPhotoFromFile = async (file: File) => {
    const imageError = validateTaskImageFile(file);
    if (imageError) {
      alert(imageError);
      return;
    }

    try {
      setPhotoUrl(await readTaskImageFile(file));
    } catch (error) {
      alert(error instanceof Error ? error.message : '이미지를 읽지 못했습니다.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void setPhotoFromFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      void setPhotoFromFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('업무 제목을 입력하세요.');
      return;
    }
    if (!location.trim()) {
      setError('작업 현장 위치를 입력하세요.');
      return;
    }
    if (selectedAssignees.length === 0) {
      setError('현장 배정인원을 1명 이상 선택하세요.');
      return;
    }
    setError('');

    onSave({
      title: title.trim(),
      category,
      description: description.trim(),
      location: location.trim(),
      priority,
      assignee: selectedAssignees.join(', '),
      dueDate: dueDate ? new Date(`${dueDate}T${dueTime || '17:00'}`).toISOString() : undefined,
      photoUrl,
    });

    // Reset fields
    setTitle('');
    setCategory(DEFAULT_DAILY_LOG_WORK_TYPE);
    setDescription('');
    setLocation('');
    setPriority('보통');
    setDueDate('');
    setDueTime('17:00');
    setSelectedAssignees([]);
    setPhotoUrl(undefined);
    onClose();
  };

  const assignableUsers = users;
  const toggleAssignee = (name: string) => {
    setSelectedAssignees((prev) => {
      const next = prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name];

      if (next.length > 0 && error) {
        setError('');
      }

      return next;
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300">
      <div 
        className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col text-slate-100"
        id="new-task-modal-box"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/25">
          <div>
            <h3 className="text-white font-black text-lg tracking-tight">업무지정</h3>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-0.5">DMU Facilities Real-Time Task Allocation Form</p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-grow">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl flex items-center gap-2 text-rose-400 text-xs font-black">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 block mb-1">업무명 <span className="text-rose-500">*</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 3층 남자 화장실 세면대 배수관 파손 교체"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800/80 bg-slate-950 text-xs focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400 outline-none text-white font-semibold"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 block mb-1">업무구분 <span className="text-rose-500">*</span></label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DailyLogWorkType)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800/80 bg-slate-950 text-xs focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400 outline-none text-white font-semibold"
              required
            >
              {DAILY_LOG_WORK_TYPES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 block mb-1">우선순위 <span className="text-rose-500">*</span></label>
              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                {(['긴급', '보통', '낮음'] as TaskPriority[]).map((p) => {
                  const isSelected = priority === p;
                  let colorClass = 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 font-bold';
                  if (isSelected) {
                    if (p === '긴급') colorClass = 'border-rose-500/50 bg-rose-500/10 text-rose-400 font-black';
                    if (p === '보통') colorClass = 'border-amber-500/50 bg-amber-500/10 text-amber-400 font-black';
                    if (p === '낮음') colorClass = 'border-indigo-500/55 bg-indigo-500/10 text-indigo-400 font-black';
                  }

                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-2 rounded-xl border text-[11px] text-center cursor-pointer transition-all uppercase tracking-wider ${colorClass}`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 block mb-1">완료 예정일시</label>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2">
              <label className="relative block">
                <CalendarClock className="w-4 h-4 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-800/80 bg-slate-950 text-xs focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400 outline-none text-white font-semibold"
                />
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                disabled={!dueDate}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800/80 bg-slate-950 text-xs focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400 outline-none text-white font-semibold disabled:text-slate-600 disabled:cursor-not-allowed"
              />
            </div>
            <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
              선택한 날짜는 Google 캘린더의 할 일 날짜로 전송되고, 시간은 할 일 메모에 함께 기록됩니다. 시간이 지나도 완료 전이면 지연으로 표시됩니다.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 block mb-1">업무내용</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="업무 범위, 준비물, 주의사항, 처리 기준 등 현장에 필요한 내용을 입력해 주십시오."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800/80 bg-slate-950 text-xs focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400 outline-none text-white font-semibold"
            />
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 block mb-1">시설/위치 <span className="text-rose-500">*</span></label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="예: 본관 4층 대회의실 B열 주밸브"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800/80 bg-slate-950 text-xs focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400 outline-none text-white font-semibold"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 mb-1">
              <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">현장 배정인원 <span className="text-rose-500">*</span></label>
              <span className={`text-[10px] font-black ${selectedAssignees.length > 0 ? 'text-indigo-300' : 'text-slate-500'}`}>
                {selectedAssignees.length > 0 ? `${selectedAssignees.length}명 선택됨` : '미선택'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {assignableUsers.map((u) => {
                const selected = selectedAssignees.includes(u.name);

                return (
                  <button
                    key={u.name}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleAssignee(u.name)}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                      selected
                        ? 'border-indigo-500/60 bg-indigo-500/15 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-sm">{u.avatar}</span>
                      <span className="font-black truncate">{u.name}</span>
                    </span>
                    <span className={`text-[10px] font-black ${selected ? 'text-indigo-300' : 'text-slate-500'}`}>
                      {selected ? '✓ 선택됨' : '선택'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photo upload dropzone */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 block mb-1">현장 참고 자료 / 사전 사진 첨부</label>
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                dragActive ? 'border-indigo-500 bg-indigo-950/20' : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {photoUrl ? (
                <div className="flex flex-col items-center space-y-2">
                  <div className="relative inline-block">
                    <img
                      src={photoUrl}
                      alt="현장 첨부 미리보기"
                      className="h-28 rounded-lg object-cover max-w-full border border-slate-800"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhotoUrl(undefined);
                      }}
                      className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white p-1 rounded-full hover:bg-rose-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-[10px] text-indigo-400 font-black uppercase tracking-wider">이미지 첨부 완료</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2 text-slate-500">
                  <Upload className="w-6 h-6 text-indigo-400" />
                  <p className="text-[11px] font-black text-slate-300">
                    파일을 드래그하거나 <span className="text-indigo-400 font-black">여기</span>를 클릭해 사전 사진을 등록하십시오.
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">마모 부품, 파손 부위, 오염 상태 등</p>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white rounded-xl text-xs font-black cursor-pointer border border-slate-700/60 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-505 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 cursor-pointer transition-colors shadow-lg shadow-indigo-500/10 border border-indigo-500/20"
            >
              <Check className="w-4 h-4" />
              <span>업무 지정</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
