import React, { useEffect, useMemo, useState } from 'react';
import { BellRing, CalendarClock, RotateCcw, ShieldCheck } from 'lucide-react';
import {
  buildSafetyEducationReminders,
  DEFAULT_SAFETY_EDUCATION_RECORDS,
  formatDateInputValue,
  getEducationDueStatus,
  SAFETY_EDUCATION_STORAGE_KEY,
  SafetyEducationRecord,
} from '../../facility/safetyEducation';

const loadRecords = () => {
  try {
    const saved = localStorage.getItem(SAFETY_EDUCATION_STORAGE_KEY);
    if (!saved) return DEFAULT_SAFETY_EDUCATION_RECORDS;
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return DEFAULT_SAFETY_EDUCATION_RECORDS;

    return DEFAULT_SAFETY_EDUCATION_RECORDS.map((defaultRecord) => ({
      ...defaultRecord,
      ...(parsed.find((item: SafetyEducationRecord) => item.id === defaultRecord.id) || {}),
    }));
  } catch {
    return DEFAULT_SAFETY_EDUCATION_RECORDS;
  }
};

const statusTone = {
  예정: 'bg-slate-800 text-slate-300 border-slate-700',
  알림기간: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  지연: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  '일정 입력 필요': 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
};

export default function SafetyEducationPanel() {
  const [records, setRecords] = useState<SafetyEducationRecord[]>(loadRecords);
  const reminders = useMemo(() => buildSafetyEducationReminders(records), [records]);
  const activeReminders = reminders.filter((reminder) => reminder.status !== '예정');
  const missingDateCount = records.filter((record) => !record.nextEducationDate).length;

  useEffect(() => {
    localStorage.setItem(SAFETY_EDUCATION_STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  const updateRecord = (
    id: string,
    field: 'completionStatus' | 'nextEducationDate',
    value: string,
  ) => {
    setRecords((previous) =>
      previous.map((record) =>
        record.id === id
          ? {
              ...record,
              [field]: value,
              nextEducationNote: field === 'nextEducationDate' && value
                ? formatDateInputValue(value)
                : record.nextEducationNote,
            }
          : record
      )
    );
  };

  const resetRecords = () => {
    if (!window.confirm('안전관리자 법정교육 현황을 첨부표 기준으로 되돌리시겠습니까?')) return;
    setRecords(DEFAULT_SAFETY_EDUCATION_RECORDS);
  };

  return (
    <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-5">
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
        <div>
          <h3 className="text-white font-black text-base flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            안전관리자 법정교육
          </h3>
          <p className="text-xs text-slate-400 font-semibold mt-1 leading-relaxed">
            첨부표 기준으로 관리자별 법정교육, 이수현황, 다음 교육일을 관리합니다. 다음 교육일은 달력으로 직접 입력합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-black">
            총 {records.length}건
          </span>
          <span className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-black">
            알림/지연 {activeReminders.length}건
          </span>
          <span className="px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-black">
            날짜 입력 필요 {missingDateCount}건
          </span>
          <button
            type="button"
            onClick={resetRecords}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-black flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            기본표 복원
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="bg-slate-950 text-slate-300 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-black">구분</th>
                <th className="px-4 py-3 font-black">관리자</th>
                <th className="px-4 py-3 font-black">법정 교육</th>
                <th className="px-4 py-3 font-black">교육 주기</th>
                <th className="px-4 py-3 font-black">이수현황</th>
                <th className="px-4 py-3 font-black">다음 교육일</th>
                <th className="px-4 py-3 font-black">상태</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const status = getEducationDueStatus(record);

                return (
                  <tr key={record.id} className="border-b border-slate-800/80 align-top">
                    <td className="px-4 py-3 text-white font-black whitespace-nowrap">{record.category}</td>
                    <td className="px-4 py-3 text-slate-200 font-bold whitespace-nowrap">{record.manager}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 font-black">
                        {record.trainingType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-semibold leading-relaxed min-w-[180px]">{record.cycle}</td>
                    <td className="px-4 py-3 min-w-[180px]">
                      <input
                        type="text"
                        value={record.completionStatus}
                        onChange={(event) => updateRecord(record.id, 'completionStatus', event.target.value)}
                        placeholder="이수일 또는 이수기간 입력"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-emerald-400"
                      />
                    </td>
                    <td className="px-4 py-3 min-w-[190px]">
                      <div className="space-y-1.5">
                        <input
                          type="date"
                          value={record.nextEducationDate}
                          onChange={(event) => updateRecord(record.id, 'nextEducationDate', event.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-emerald-400"
                        />
                        <p className="text-[10px] text-slate-500 font-bold">
                          {record.nextEducationDate ? formatDateInputValue(record.nextEducationDate) : record.nextEducationNote || '날짜 입력 필요'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-lg border text-[10px] font-black ${statusTone[status]}`}>
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
            <h4 className="text-amber-200 font-black text-sm flex items-center gap-2">
              <BellRing className="w-4 h-4" />
              현재 알림 대상
            </h4>
            <p className="text-[11px] text-amber-100/70 font-semibold mt-1 leading-relaxed">
              다음 교육일 기준 6개월, 5개월, 4개월, 3개월, 2개월, 1개월 전부터 확인 대상에 표시합니다.
            </p>
            <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {activeReminders.length === 0 ? (
                <div className="rounded-xl bg-slate-950/70 border border-slate-800 px-3 py-4 text-center text-slate-500 text-xs font-bold">
                  현재 알림 대상이 없습니다.
                </div>
              ) : (
                activeReminders.slice(0, 12).map((reminder) => (
                  <div key={`${reminder.recordId}-${reminder.monthsBefore}`} className="rounded-xl bg-slate-950/70 border border-slate-800 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-white text-xs font-black">{reminder.category}</p>
                      <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-black ${statusTone[reminder.status]}`}>
                        {reminder.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-bold mt-1">
                      {reminder.manager} · {reminder.trainingType} · {reminder.monthsBefore}개월 전 알림
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold mt-1">
                      알림일 {reminder.reminderDate} / 교육일 {reminder.nextEducationDate}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <h4 className="text-white font-black text-sm flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-indigo-300" />
              알림 기준
            </h4>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[6, 5, 4, 3, 2, 1].map((month) => (
                <div key={month} className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-center">
                  <p className="text-white text-sm font-black">{month}개월</p>
                  <p className="text-[10px] text-slate-500 font-bold">전 알림</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mt-3">
              브라우저를 열면 입력된 다음 교육일을 기준으로 알림 대상과 지연 대상을 자동 계산합니다.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
