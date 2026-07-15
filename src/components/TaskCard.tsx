import React from 'react';
import { Task } from '../types';
import { MapPin, Calendar, Clock, AlertTriangle, Paperclip, MessageSquare, CheckSquare } from 'lucide-react';
import { getTaskStatusLabel, isApprovalPending } from '../lib/taskState';
import { formatTaskAssigneeLabel, splitTaskAssignees } from '../lib/taskAssignees';

interface TaskCardProps {
  key?: React.Key;
  task: Task;
  onSelect: (task: Task) => void;
  onAssigneeAction?: (task: Task) => void;
  currentUserSpecialty?: string;
  isSynced?: boolean;
  isCurrentUserAssignee?: boolean;
}

const PRIORITY_STYLES = {
  '긴급': { bg: 'bg-rose-500/15 text-rose-400 border border-rose-500/30 font-black uppercase tracking-wider', icon: AlertTriangle },
  '보통': { bg: 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-black uppercase tracking-wider', icon: null },
  '낮음': { bg: 'bg-slate-800 text-slate-400 border border-slate-700 font-bold uppercase tracking-wider', icon: null },
};

export default function TaskCard({ task, onSelect, onAssigneeAction, isSynced, isCurrentUserAssignee = false }: TaskCardProps) {
  const priorityStyle = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES['보통'];
  const statusLabel = getTaskStatusLabel(task);
  const assigneeNames = splitTaskAssignees(task.assignee);
  const primaryAssignee = assigneeNames[0] || '';
  const showAssigneeAction = isCurrentUserAssignee && (task.status !== '완료' || isApprovalPending(task));
  const assigneeActionLabel =
    task.status === '대기중'
      ? '업무 접수'
      : task.status === '완료'
        ? '완료 내용 확인 / 수정'
        : '완료 내용 입력';

  // Format date readable
  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.getMonth() + 1}월 ${d.getDate()}일 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div
      onClick={() => onSelect(task)}
      className="bg-slate-900/40 backdrop-blur-md rounded-3xl border border-slate-850 hover:border-indigo-500/50 hover:bg-slate-900/80 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 cursor-pointer p-6 flex flex-col h-full group relative overflow-hidden"
      id={`task-card-${task.id}`}
    >
      {/* Upper row: Badges */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border bg-indigo-500/10 text-indigo-300 border-indigo-500/20 shrink-0">
            업무지정
          </span>
          <span className="px-2.5 py-1 text-[10px] font-black rounded-full border bg-emerald-500/10 text-emerald-300 border-emerald-500/20 truncate max-w-[150px]" title={task.category}>
            {task.category}
          </span>
        </div>
        <div className="flex items-center space-x-1.5">
          {isSynced && (
            <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-505/20 flex items-center gap-1" title="시설관리팀 Google 할 일 연동됨">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
              G-CAL
            </span>
          )}
          {task.priority === '긴급' && (
            <span className={`px-2.5 py-0.5 text-[10px] rounded-full ${priorityStyle.bg} flex items-center space-x-1 animate-pulse`}>
              <AlertTriangle className="w-2.5 h-2.5" />
              <span>긴급요청</span>
            </span>
          )}
          {task.priority !== '긴급' && (
            <span className={`px-2.5 py-0.5 text-[10px] rounded-full ${priorityStyle.bg}`}>
              {task.priority}
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-white font-black text-base md:text-lg tracking-tight line-clamp-2 mb-2 leading-tight group-hover:text-indigo-400 transition-colors duration-200">
        {task.title}
      </h3>

      {showAssigneeAction && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (onAssigneeAction) {
              onAssigneeAction(task);
              return;
            }
            onSelect(task);
          }}
          className="mb-4 w-full rounded-2xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-sm font-black text-emerald-100 hover:bg-emerald-500/25 hover:border-emerald-300 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/5"
        >
          <CheckSquare className="w-4 h-4 text-emerald-300" />
          <span>{assigneeActionLabel}</span>
        </button>
      )}

      {/* Info labels */}
      <div className="space-y-2 text-xs text-slate-400 mb-5 flex-grow font-semibold">
        <div className="flex items-start space-x-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
          <span className="truncate text-slate-300">{task.location}</span>
        </div>
        <div className="flex items-center space-x-1.5 text-slate-500">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>등록일: {formatDate(task.createdAt)}</span>
        </div>
        {task.dueDate && (
          <div className="flex items-center space-x-1.5 text-slate-500">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>완료 예정: {formatDate(task.dueDate)}</span>
          </div>
        )}
        {task.completedAt && (
          <div className="flex items-center space-x-1.5 font-extrabold uppercase tracking-wider text-[10.5px] text-emerald-400">
            <CheckSquare className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
            <span>완료 일시: {formatDate(task.completedAt)}</span>
          </div>
        )}
      </div>

      {/* Lower Row: Assignee and status indicator */}
      <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between mt-auto">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-slate-800 border border-slate-700/60 rounded-full flex items-center justify-center text-sm shadow-inner group-hover:border-indigo-500/40 transition-colors">
            {primaryAssignee === '이민우' ? '⚡' : primaryAssignee === '박준서' ? '❄️' : primaryAssignee === '최현우' ? '🧱' : primaryAssignee === '강선아' ? '📊' : '👤'}
          </div>
          <div>
            <div className="text-xs font-black text-slate-200">{formatTaskAssigneeLabel(task.assignee)}</div>
            <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest">현장 배정인원</div>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center space-x-2">
          {/* Photos/attach count indicators */}
          <div className="flex items-center space-x-1.5 text-slate-500 text-xs mr-1">
            {(task.photoUrl || task.completionPhotoUrl) && (
              <div title="사진 증적자료 첨부됨">
                <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
              </div>
            )}
            {task.comments.length > 0 && (
              <div className="flex items-center space-x-0.5 text-slate-400" title="의견 교환">
                <MessageSquare className="w-3.5 h-3.5 group-hover:text-indigo-400 transition-colors" />
                <span className="text-[10px] font-black font-mono">{task.comments.length}</span>
              </div>
            )}
          </div>

          {statusLabel === '지연' && (
            <span className="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30 flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3 text-rose-300" />
              <span>지연</span>
            </span>
          )}
          {statusLabel === '접수대기' && (
            <span className="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              접수대기
            </span>
          )}
          {statusLabel === '진행중' && (
            <span className="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center space-x-1 animate-pulse">
              <Clock className="w-3 h-3 text-amber-400 animate-spin" />
              <span>진행중</span>
            </span>
          )}
          {statusLabel === '완료' && (
            <span className="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center">
              <CheckSquare className="w-3.5 h-3.5 text-emerald-400 mr-1" />
              완료
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

