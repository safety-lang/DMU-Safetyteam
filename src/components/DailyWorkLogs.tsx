import React, { useMemo, useState } from 'react';
import { UserProfile, DailyLog, DailyLogComment } from '../types';
import {
  AlertCircle,
  Briefcase,
  Calendar,
  CheckCircle2,
  Coffee,
  ListPlus,
  MessageSquare,
  Send,
  TrendingUp,
  User,
} from 'lucide-react';
import {
  DAILY_LOG_WORK_TYPES,
  DEFAULT_DAILY_LOG_WORK_TYPE,
  DailyLogWorkType,
} from '../lib/dailyLogWorkTypes';

type DailyLogStatus = '대기중' | '진행중' | '완료';

interface DailyWorkLogsProps {
  currentUser: UserProfile;
  dailyLogs: DailyLog[];
  setDailyLogs: React.Dispatch<React.SetStateAction<DailyLog[]>>;
  users: UserProfile[];
  addToast: (title: string, message: string, avatar?: string) => void;
  readOnly?: boolean;
}

const getTodayDate = () => new Date().toISOString().slice(0, 10);

const formatDateLabel = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
};

const formatTime = (isoString?: string) => {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
};

const sortLogs = (logs: DailyLog[]) =>
  [...logs].sort((first, second) => {
    const firstTime = new Date(first.morningSubmittedAt || first.eveningSubmittedAt || first.date).getTime();
    const secondTime = new Date(second.morningSubmittedAt || second.eveningSubmittedAt || second.date).getTime();
    return firstTime - secondTime;
  });

const getLogWorkType = (log: DailyLog) => log.workType || DEFAULT_DAILY_LOG_WORK_TYPE;

const statusClassName = (status: DailyLogStatus) => {
  if (status === '완료') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25';
  if (status === '진행중') return 'bg-amber-500/10 text-amber-300 border-amber-500/25';
  return 'bg-slate-800 text-slate-300 border-slate-700';
};

export default function DailyWorkLogs({
  currentUser,
  dailyLogs,
  setDailyLogs,
  users,
  addToast,
  readOnly = false,
}: DailyWorkLogsProps) {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [workType, setWorkType] = useState<DailyLogWorkType>(DEFAULT_DAILY_LOG_WORK_TYPE);
  const [workTitle, setWorkTitle] = useState('');
  const [workLocation, setWorkLocation] = useState('');
  const [morningText, setMorningText] = useState('');
  const [resultTexts, setResultTexts] = useState<Record<string, string>>({});
  const [remarkTexts, setRemarkTexts] = useState<Record<string, string>>({});
  const [statusTexts, setStatusTexts] = useState<Record<string, DailyLogStatus>>({});
  const [feedbackTexts, setFeedbackTexts] = useState<Record<string, string>>({});

  const isManager = currentUser.role === '팀장';
  const teamMembers = users;
  const filteredLogs = useMemo(
    () => sortLogs(dailyLogs.filter((log) => log.date === selectedDate)),
    [dailyLogs, selectedDate],
  );
  const currentUserLogs = filteredLogs.filter((log) => log.employeeId === currentUser.id);

  const addWorkItem = (event: React.FormEvent) => {
    event.preventDefault();
    if (readOnly) {
      addToast('읽기 전용 계정', `${currentUser.name} ${currentUser.role} 계정은 근무일지를 조회할 수만 있습니다.`, 'ℹ️');
      return;
    }
    if (!workTitle.trim()) return;
    if (!morningText.trim()) return;

    const timestamp = new Date().toISOString();
    const newLog: DailyLog = {
      id: `log_${currentUser.id}_${Date.now()}`,
      date: selectedDate,
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      employeeRole: currentUser.role,
      workType,
      workTitle: workTitle.trim(),
      workLocation: workLocation.trim(),
      morningPlan: morningText.trim(),
      morningSubmittedAt: timestamp,
      eveningResult: '',
      eveningStatus: '대기중',
      managerFeedbackList: [],
    };

    setDailyLogs((prev) => [newLog, ...prev]);
    setWorkTitle('');
    setWorkLocation('');
    setMorningText('');
    addToast('업무 항목 추가 완료', `${workTitle.trim()} 업무가 셀프 근무일지에 기록되었습니다.`, currentUser.avatar);
  };

  const saveResult = (log: DailyLog) => {
    if (readOnly) {
      addToast('읽기 전용 계정', `${currentUser.name} ${currentUser.role} 계정은 결과를 저장할 수 없습니다.`, 'ℹ️');
      return;
    }

    const result = (resultTexts[log.id] ?? log.eveningResult).trim();
    const remarks = (remarkTexts[log.id] ?? log.remarks ?? '').trim();
    if (!result) {
      addToast('결과 입력 필요', '결과 내용을 입력한 뒤 저장해 주세요.', '⚠️');
      return;
    }

    const status = statusTexts[log.id] || log.eveningStatus;
    const timestamp = new Date().toISOString();

    setDailyLogs((prev) =>
      prev.map((item) =>
        item.id === log.id
          ? {
              ...item,
              eveningResult: result,
              remarks,
              eveningStatus: status,
              eveningSubmittedAt: timestamp,
            }
          : item,
      ),
    );

    setResultTexts((prev) => {
      const next = { ...prev };
      delete next[log.id];
      return next;
    });
    setRemarkTexts((prev) => {
      const next = { ...prev };
      delete next[log.id];
      return next;
    });
    setStatusTexts((prev) => {
      const next = { ...prev };
      delete next[log.id];
      return next;
    });

    addToast('결과 저장 완료', `${getLogWorkType(log)} 업무 결과를 저장했습니다.`, currentUser.avatar);
  };

  const submitManagerFeedback = (log: DailyLog) => {
    const feedbackText = feedbackTexts[log.id];
    if (!feedbackText?.trim()) return;

    const newComment: DailyLogComment = {
      id: `fb_comment_${Date.now()}`,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      content: feedbackText.trim(),
      timestamp: new Date().toISOString(),
    };

    setDailyLogs((prev) =>
      prev.map((item) =>
        item.id === log.id
          ? {
              ...item,
              managerFeedbackList: [...item.managerFeedbackList, newComment],
            }
          : item,
      ),
    );
    setFeedbackTexts((prev) => ({ ...prev, [log.id]: '' }));
    addToast('팀장 피드백 등록', `${log.employeeName}님의 ${getLogWorkType(log)} 업무에 피드백을 남겼습니다.`, currentUser.avatar);
  };

  const renderLogSummary = (log: DailyLog, allowResultEdit: boolean, allowFeedback: boolean) => {
    const resultValue = resultTexts[log.id] ?? log.eveningResult;
    const remarkValue = remarkTexts[log.id] ?? log.remarks ?? '';
    const statusValue = statusTexts[log.id] || log.eveningStatus;

    return (
      <article key={log.id} className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-indigo-200 px-2.5 py-1 text-[11px] font-semibold">
                {getLogWorkType(log)}
              </span>
              <span className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${statusClassName(log.eveningStatus)}`}>
                {log.eveningStatus}
              </span>
            </div>
            <h4 className="text-white text-sm font-semibold">{log.workTitle || log.morningPlan}</h4>
            <p className="text-[11px] text-slate-500 font-semibold">
              오늘 할 일 작성시간 {formatTime(log.morningSubmittedAt) || '-'}
              {log.eveningSubmittedAt ? ` · 결과 작성시간 ${formatTime(log.eveningSubmittedAt)}` : ''}
            </p>
            {log.workLocation && (
              <p className="text-[11px] text-slate-400 font-semibold">시설/위치: {log.workLocation}</p>
            )}
          </div>
        </div>

        {log.workTitle && (
          <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3">
            <p className="text-[11px] text-indigo-300 font-semibold mb-1">업무내용</p>
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">{log.morningPlan}</p>
          </div>
        )}

        {log.eveningResult && !allowResultEdit && (
          <div className="rounded-xl bg-slate-900/75 border border-slate-800 p-3">
            <p className="text-[11px] text-emerald-300 font-semibold mb-1">결과</p>
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">{log.eveningResult}</p>
          </div>
        )}

        {log.remarks && !allowResultEdit && (
          <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3">
            <p className="text-[11px] text-amber-300 font-semibold mb-1">비고</p>
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">{log.remarks}</p>
          </div>
        )}

        {allowResultEdit && (
          <div className="space-y-3">
            <textarea
              rows={3}
              value={resultValue}
              onChange={(event) => setResultTexts((prev) => ({ ...prev, [log.id]: event.target.value }))}
              placeholder="업무 결과를 입력하세요."
              className="w-full px-3.5 py-3 rounded-xl border border-slate-800 bg-slate-950 text-sm focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-400 outline-none text-white font-medium placeholder:text-slate-600"
            />
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 block">비고</label>
              <textarea
                rows={2}
                value={remarkValue}
                onChange={(event) => setRemarkTexts((prev) => ({ ...prev, [log.id]: event.target.value }))}
                placeholder="유의사항, 개선사항, 검토사항, 건의사항 등을 입력하세요."
                className="w-full px-3.5 py-3 rounded-xl border border-slate-800 bg-slate-950 text-sm focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 outline-none text-white font-medium placeholder:text-slate-600"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 border border-slate-800 rounded-xl">
                {(['대기중', '진행중', '완료'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusTexts((prev) => ({ ...prev, [log.id]: status }))}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
                      statusValue === status
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => saveResult(log)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                결과 저장
              </button>
            </div>
          </div>
        )}

        <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <span className="text-xs font-semibold text-indigo-300 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              팀장 피드백 {log.managerFeedbackList.length}건
            </span>
          </div>

          {log.managerFeedbackList.length === 0 ? (
            <p className="text-xs text-slate-600 font-semibold text-center py-2">등록된 피드백이 없습니다.</p>
          ) : (
            <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
              {log.managerFeedbackList.map((feedback) => (
                <div key={feedback.id} className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-indigo-300">{feedback.senderName} ({feedback.senderRole})</span>
                    <span className="text-slate-500">{formatTime(feedback.timestamp)}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{feedback.content}</p>
                </div>
              ))}
            </div>
          )}

          {allowFeedback && (
            <div className="flex gap-2 pt-1 border-t border-slate-900">
              <input
                type="text"
                value={feedbackTexts[log.id] || ''}
                onChange={(event) => setFeedbackTexts((prev) => ({ ...prev, [log.id]: event.target.value }))}
                placeholder={`${log.employeeName}님 업무에 팀장 피드백 입력`}
                className="flex-grow px-3 py-2 bg-slate-900 text-sm border border-slate-800 rounded-xl outline-none focus:border-indigo-400 text-white font-medium placeholder:text-slate-600"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submitManagerFeedback(log);
                }}
              />
              <button
                type="button"
                onClick={() => submitManagerFeedback(log)}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl cursor-pointer flex items-center justify-center transition-colors shrink-0"
                title="피드백 전송"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-6" id="daily-work-logs-portal">
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 bg-indigo-600/15 text-indigo-400 rounded-2xl border border-indigo-500/20">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-lg tracking-tight">Self-Managed Work Logs (셀프 관리 근무일지)</h2>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mt-0.5">
              Personal To-Do, Result and Manager Feedback Console
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 border border-slate-800 rounded-2xl">
          {[
            { label: `어제 (${formatDateLabel('2026-05-22')})`, value: '2026-05-22' },
            { label: `오늘 (${formatDateLabel('2026-05-23')})`, value: '2026-05-23' },
          ].map((dateOption) => (
            <button
              key={dateOption.value}
              type="button"
              onClick={() => setSelectedDate(dateOption.value)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                selectedDate === dateOption.value
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {dateOption.label}
            </button>
          ))}
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => {
              if (event.target.value) setSelectedDate(event.target.value);
            }}
            className="bg-slate-900 text-slate-300 px-2 py-1.5 border border-slate-800 rounded-lg text-xs font-semibold outline-none focus:border-indigo-500 cursor-pointer"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <section className="xl:col-span-4 bg-slate-900/60 backdrop-blur-md rounded-3xl p-5 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <span className="text-sm font-semibold text-indigo-200 flex items-center gap-2">
                <Coffee className="w-4 h-4 text-amber-400" />
                새 업무 추가
              </span>
              <span className="text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-semibold">
                계속 추가 가능
              </span>
            </div>

            <form onSubmit={addWorkItem} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 block">
                  업무명 <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={workTitle}
                  onChange={(event) => setWorkTitle(event.target.value)}
                  placeholder="예: 3호관 분리수거장 배수 상태 확인"
                  className="w-full px-3.5 py-3 rounded-xl border border-slate-800 bg-slate-950 text-sm focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400 outline-none text-white font-medium placeholder:text-slate-600"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 block">
                  업무분류 <span className="text-rose-400">*</span>
                </label>
                <select
                  value={workType}
                  onChange={(event) => setWorkType(event.target.value as DailyLogWorkType)}
                  className="w-full px-3.5 py-3 rounded-xl border border-slate-800 bg-slate-950 text-sm focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400 outline-none text-white font-medium"
                >
                  {DAILY_LOG_WORK_TYPES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 block">
                  시설/위치
                </label>
                <input
                  type="text"
                  value={workLocation}
                  onChange={(event) => setWorkLocation(event.target.value)}
                  placeholder="예: 3호관 후면, 본관 4층, 공학관 연구실"
                  className="w-full px-3.5 py-3 rounded-xl border border-slate-800 bg-slate-950 text-sm focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400 outline-none text-white font-medium placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 block">
                  업무내용 <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={5}
                  value={morningText}
                  onChange={(event) => setMorningText(event.target.value)}
                  placeholder="업무 범위, 처리 기준, 준비물, 주의사항 등을 입력하세요. 필요한 만큼 업무를 계속 추가할 수 있습니다."
                  className="w-full px-3.5 py-3 rounded-xl border border-slate-800 bg-slate-950 text-sm focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400 outline-none text-white font-medium placeholder:text-slate-600"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <ListPlus className="w-4 h-4" />
                업무 항목 추가
              </button>
            </form>
        </section>

        <section className="xl:col-span-8 bg-slate-900/60 backdrop-blur-md rounded-3xl p-5 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <span className="text-sm font-semibold text-emerald-200 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                나의 업무 항목
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                {currentUserLogs.length}건
              </span>
            </div>

            {currentUserLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center">
                <AlertCircle className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500 font-semibold">아직 등록한 업무가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentUserLogs.map((log) => renderLogSummary(log, true, false))}
              </div>
            )}
        </section>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            개인별 셀프 근무일지 현황 ({filteredLogs.length}건)
          </span>
          <span className="text-xs text-slate-500 font-mono">DATE: {selectedDate}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {teamMembers.map((staff) => {
            const staffLogs = filteredLogs.filter((log) => log.employeeId === staff.id);
            const completedCount = staffLogs.filter((log) => log.eveningStatus === '완료').length;

            return (
              <section
                key={staff.id}
                className={`rounded-3xl border p-5 space-y-4 transition-all duration-300 ${
                  staffLogs.length > 0
                    ? 'bg-slate-900 border-slate-800 shadow-xl'
                    : 'bg-slate-950/40 border-slate-900/80 opacity-75 hover:opacity-100'
                }`}
                id={`daily-card-${staff.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl bg-slate-950 p-2.5 border border-slate-800 rounded-2xl shadow-inner select-none">
                      {staff.avatar}
                    </span>
                    <div>
                      <h3 className="text-white font-semibold text-base tracking-tight flex items-center gap-1.5">
                        {staff.name}
                        <span className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/15 text-xs px-1.5 py-0.5 rounded font-semibold">
                          {staff.role}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold mt-1">
                        등록 {staffLogs.length}건 · 완료 {completedCount}건
                      </p>
                    </div>
                  </div>

                  {staffLogs.length > 0 ? (
                    <span className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                      {completedCount}/{staffLogs.length}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg text-xs bg-slate-950 text-slate-600 border border-slate-900 font-semibold">
                      미작성
                    </span>
                  )}
                </div>

                {staffLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-900 bg-slate-950/20 rounded-2xl select-none">
                    <AlertCircle className="w-5 h-5 text-slate-700 mb-1.5" />
                    <span className="text-xs text-slate-500 font-semibold text-center">
                      아직 등록된 셀프 근무일지가 없습니다.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {staffLogs.map((log) => renderLogSummary(log, false, isManager && staff.id !== currentUser.id))}
                  </div>
                )}

                {staff.id === currentUser.id && staffLogs.length > 0 && (
                  <div className="bg-indigo-950/15 border border-indigo-500/20 p-3 rounded-xl flex items-start gap-2.5">
                    <User className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-indigo-200 font-medium leading-relaxed">
                      업무 항목별로 결과를 저장하면 관리자 화면의 업무 완료 목록과 업무실적 누적대장에 반영됩니다.
                    </span>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

