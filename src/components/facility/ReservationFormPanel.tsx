import React, { useEffect, useState } from 'react';
import { CalendarPlus, X } from 'lucide-react';
import { EMPTY_RESERVATION_FORM, hasReservationErrors, validateReservationForm } from '../../facility/reservationValidation';
import { Facility, FacilityReservation, MajorScheduleKind, ReservationFormValues } from '../../facility/types';

interface ReservationFormPanelProps {
  facilities: Facility[];
  reservations: FacilityReservation[];
  editingReservation: FacilityReservation | null;
  onSubmit: (values: ReservationFormValues) => void;
  onCancelEdit: () => void;
}

const SCHEDULE_KINDS: MajorScheduleKind[] = ['대관', '점검', '행사', '외부업체', '법정검사', '기타'];

const getDefaultStart = () => {
  const start = new Date(Date.now() + 60 * 60 * 1000);
  start.setMinutes(0, 0, 0);
  return start.toISOString().slice(0, 16);
};

const getDefaultEnd = () => {
  const end = new Date(Date.now() + 2 * 60 * 60 * 1000);
  end.setMinutes(0, 0, 0);
  return end.toISOString().slice(0, 16);
};

const buildInitialValues = (
  editingReservation: FacilityReservation | null,
): ReservationFormValues => {
  if (editingReservation) {
    return {
      facilityId: editingReservation.facilityId,
      scheduleKind: editingReservation.scheduleKind || '대관',
      title: editingReservation.title || editingReservation.facilityName || '',
      location: editingReservation.location || '',
      requesterOrganization: editingReservation.requesterOrganization || '',
      purpose: editingReservation.purpose,
      startAt: editingReservation.startAt,
      endAt: editingReservation.endAt,
    };
  }

  return {
    ...EMPTY_RESERVATION_FORM,
    startAt: getDefaultStart(),
    endAt: getDefaultEnd(),
  };
};

export default function ReservationFormPanel({
  facilities,
  reservations,
  editingReservation,
  onSubmit,
  onCancelEdit,
}: ReservationFormPanelProps) {
  const [values, setValues] = useState<ReservationFormValues>(() => buildInitialValues(editingReservation));
  const [submitted, setSubmitted] = useState(false);
  const errors = validateReservationForm(
    values,
    facilities,
    reservations,
    new Date(),
    editingReservation?.id,
  );

  useEffect(() => {
    setValues(buildInitialValues(editingReservation));
    setSubmitted(false);
  }, [editingReservation]);

  const updateField = (name: keyof ReservationFormValues, value: string) =>
    setValues((previous) => ({ ...previous, [name]: value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (hasReservationErrors(errors)) return;
    onSubmit(values);
    setValues(buildInitialValues(null));
    setSubmitted(false);
  };

  return (
    <form onSubmit={submit} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-white font-black text-sm flex items-center gap-2">
            <CalendarPlus className="w-4 h-4 text-indigo-400" />
            {editingReservation ? '주요 일정 수정' : '주요 일정 등록'}
          </h3>
          <p className="text-[11px] text-slate-500 font-bold leading-relaxed mt-1">
            대관, 점검, 행사, 외부업체 방문 등 시설관리팀 주요 일정을 한 곳에 등록합니다.
          </p>
        </div>
        {editingReservation && (
          <button type="button" onClick={onCancelEdit} className="p-1.5 rounded-lg text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="space-y-1.5">
          <span className="text-[10px] text-slate-500 font-black">일정구분 *</span>
          <select
            value={values.scheduleKind}
            onChange={(event) => updateField('scheduleKind', event.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-black outline-none"
          >
            {SCHEDULE_KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-[10px] text-slate-500 font-black">관련 시설 선택</span>
          <select
            value={values.facilityId}
            onChange={(event) => updateField('facilityId', event.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-black outline-none"
          >
            <option value="">시설 선택 안 함</option>
            {facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name} ({facility.status})</option>)}
          </select>
        </label>
      </div>
      {submitted && errors.facilityId && <p className="text-[10px] text-rose-400 font-bold">{errors.facilityId}</p>}

      <label className="space-y-1.5 block">
        <span className="text-[10px] text-slate-500 font-black">일정 제목 *</span>
        <input
          type="text"
          value={values.title}
          onChange={(event) => updateField('title', event.target.value)}
          placeholder="예: 2호관 대강당 대관, 승강기 정기검사, 외부업체 방문"
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none"
        />
      </label>
      {submitted && errors.title && <p className="text-[10px] text-rose-400 font-bold">{errors.title}</p>}

      <label className="space-y-1.5 block">
        <span className="text-[10px] text-slate-500 font-black">시설/위치</span>
        <input
          type="text"
          value={values.location}
          onChange={(event) => updateField('location', event.target.value)}
          placeholder="선택 입력: 장소, 건물명, 세부 위치"
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none"
        />
      </label>

      <label className="space-y-1.5 block">
        <span className="text-[10px] text-slate-500 font-black">요청기관/관련부서{values.scheduleKind === '대관' ? ' *' : ''}</span>
        <input
          type="text"
          value={values.requesterOrganization}
          onChange={(event) => updateField('requesterOrganization', event.target.value)}
          placeholder="예: 건축학과, 총학생회, 외부 기관, 관련 부서"
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none"
        />
      </label>
      {submitted && errors.requesterOrganization && <p className="text-[10px] text-rose-400 font-bold">{errors.requesterOrganization}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="space-y-1.5">
          <span className="text-[10px] text-slate-500 font-black">시작일시 *</span>
          <input type="datetime-local" value={values.startAt} onChange={(event) => updateField('startAt', event.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none" />
        </label>
        <label className="space-y-1.5">
          <span className="text-[10px] text-slate-500 font-black">완료/종료 예정일시 *</span>
          <input type="datetime-local" value={values.endAt} onChange={(event) => updateField('endAt', event.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none" />
        </label>
      </div>
      {submitted && (errors.startAt || errors.endAt || errors.overlap) && (
        <p className="text-[10px] text-rose-400 font-bold">{errors.startAt || errors.endAt || errors.overlap}</p>
      )}

      <textarea
        value={values.purpose}
        onChange={(event) => updateField('purpose', event.target.value)}
        rows={4}
        placeholder="일정 내용, 준비 요청, 특이사항, 확인할 사항을 입력하세요."
        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none"
      />
      {submitted && errors.purpose && <p className="text-[10px] text-rose-400 font-bold">{errors.purpose}</p>}

      <button type="submit" className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black">
        {editingReservation ? '주요 일정 수정 저장' : '주요 일정 등록'}
      </button>
    </form>
  );
}
