import React, { useMemo } from 'react';
import { CalendarClock, Download, Pencil } from 'lucide-react';
import {
  buildMajorScheduleItems,
  formatMajorScheduleDateTime,
  getReservationStatusLabel,
  MajorScheduleItem,
  MajorScheduleStatus,
} from '../../facility/majorSchedule';
import { DailyLog, Task } from '../../types';
import { FacilityReservation, FacilityRole, ReservationStatus } from '../../facility/types';

interface ReservationListPanelProps {
  reservations: FacilityReservation[];
  exportReservations: FacilityReservation[];
  tasks: Task[];
  dailyLogs: DailyLog[];
  role: FacilityRole;
  onEdit: (reservation: FacilityReservation) => void;
  onStatusChange: (id: string, status: ReservationStatus, reason?: string) => void;
}

const statusClass: Record<MajorScheduleStatus, string> = {
  예정: 'bg-slate-800 text-slate-300 border-slate-700',
  진행: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
  완료: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
  지연: 'bg-rose-500/10 text-rose-300 border-rose-500/25',
  취소: 'bg-slate-950 text-slate-500 border-slate-800',
};

const escapeCsvCell = (value: string | number) =>
  `"${String(value).replace(/"/g, '""')}"`;

const buildMajorScheduleCsv = (items: MajorScheduleItem[]) => {
  const headers = ['출발점', '일정구분', '상태', '시작일시', '완료/종료 예정일시', '제목', '담당자', '시설/위치', '내용'];
  const rows = items.map((item) => [
    item.source,
    item.category,
    item.status,
    formatMajorScheduleDateTime(item.startAt),
    formatMajorScheduleDateTime(item.dueAt),
    item.title,
    item.assignee,
    item.location,
    item.content,
  ]);
  return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n');
};

const sourceClass = (source: MajorScheduleItem['source']) => {
  if (source === '업무지정') return 'bg-indigo-500/10 text-indigo-200 border-indigo-500/25';
  if (source === '셀프 관리 근무일지') return 'bg-emerald-500/10 text-emerald-200 border-emerald-500/25';
  return 'bg-cyan-500/10 text-cyan-200 border-cyan-500/25';
};

export default function ReservationListPanel({
  reservations,
  exportReservations,
  tasks,
  dailyLogs,
  role,
  onEdit,
  onStatusChange,
}: ReservationListPanelProps) {
  const isAdmin = role === 'admin';
  const scheduleItems = useMemo(
    () => buildMajorScheduleItems(exportReservations, tasks, dailyLogs),
    [dailyLogs, exportReservations, tasks],
  );
  const reservationById = useMemo(
    () => new Map(reservations.map((reservation) => [`reservation:${reservation.id}`, reservation])),
    [reservations],
  );

  const summary = useMemo(() => ({
    total: scheduleItems.length,
    active: scheduleItems.filter((item) => item.status === '진행').length,
    completed: scheduleItems.filter((item) => item.status === '완료').length,
    delayed: scheduleItems.filter((item) => item.status === '지연').length,
  }), [scheduleItems]);

  const downloadCsv = () => {
    const csv = buildMajorScheduleCsv(scheduleItems);
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `주요일정_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-4">
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
        <div>
          <h3 className="text-white font-black text-sm flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-indigo-400" />
            주요 일정 현황
          </h3>
          <p className="text-[11px] text-slate-500 font-bold mt-1">
            업무지정, 셀프 관리 근무일지, 직접 등록 일정을 한 화면에서 공유합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ['전체', summary.total],
            ['진행', summary.active],
            ['완료', summary.completed],
            ['지연', summary.delayed],
          ].map(([label, value]) => (
            <span key={label} className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-[11px] text-slate-300 font-black">
              {label} {value}
            </span>
          ))}
          {isAdmin && (
            <button
              type="button"
              onClick={downloadCsv}
              disabled={scheduleItems.length === 0}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-[11px] font-black flex items-center gap-1.5 disabled:text-slate-600 disabled:cursor-not-allowed w-max"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              CSV 내보내기
            </button>
          )}
        </div>
      </div>

      {scheduleItems.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center text-slate-500 text-xs font-bold">
          등록된 주요 일정이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {scheduleItems.map((item) => {
            const reservation = reservationById.get(item.id);
            return (
              <article key={item.id} className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black ${sourceClass(item.source)}`}>
                        {item.source}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg border text-[10px] font-black bg-slate-900 text-slate-300 border-slate-700">
                        {item.category}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black ${statusClass[item.status]}`}>
                        {item.status}
                      </span>
                    </div>
                    <h4 className="text-white font-black text-sm">{item.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-1 whitespace-pre-line">{item.content}</p>
                  </div>
                  {reservation && isAdmin && (
                    <div className="flex flex-wrap gap-2 items-center">
                      <button
                        type="button"
                        onClick={() => onEdit(reservation)}
                        className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-[11px] font-black flex items-center gap-1.5"
                      >
                        <Pencil className="w-3.5 h-3.5 text-amber-300" />
                        수정
                      </button>
                      <ReservationStatusSelect reservation={reservation} onStatusChange={onStatusChange} />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 text-[11px] text-slate-400 font-bold">
                  <span>시작: {formatMajorScheduleDateTime(item.startAt)}</span>
                  <span>예정: {formatMajorScheduleDateTime(item.dueAt)}</span>
                  <span>담당자: {item.assignee}</span>
                  <span>시설/위치: {item.location || '-'}</span>
                  {reservation?.requesterOrganization && (
                    <span className="xl:col-span-2">요청기관/관련부서: {reservation.requesterOrganization}</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface ReservationStatusSelectProps {
  reservation: FacilityReservation;
  onStatusChange: (id: string, status: ReservationStatus, reason?: string) => void;
}

function ReservationStatusSelect({ reservation, onStatusChange }: ReservationStatusSelectProps) {
  return (
    <select
      value={reservation.status === 'approved' || reservation.status === 'rejected' ? 'in_progress' : reservation.status}
      onChange={(event) => onStatusChange(reservation.id, event.target.value as ReservationStatus)}
      className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-[11px] font-black outline-none"
      title={`현재 상태: ${getReservationStatusLabel(reservation.status)}`}
    >
      <option value="pending">예정</option>
      <option value="in_progress">진행</option>
      <option value="completed">완료</option>
      <option value="cancelled">취소</option>
    </select>
  );
}

