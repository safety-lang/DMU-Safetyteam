import React from 'react';
import { Building2, CheckCircle2, MapPin, Pencil, Users } from 'lucide-react';
import { Facility } from '../../facility/types';

interface FacilityDetailPanelProps {
  facility: Facility | null;
  canManage?: boolean;
  onEdit?: (facility: Facility) => void;
}

export default function FacilityDetailPanel({
  facility,
  canManage = false,
  onEdit,
}: FacilityDetailPanelProps) {
  if (!facility) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 text-center text-slate-500 text-xs font-bold">
        시설 카드를 선택하면 상세 정보와 예약 가능 여부가 표시됩니다.
      </div>
    );
  }

  const reservable = facility.status === '운영중';

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-4">
      <div className="h-40 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
        {facility.imageUrl ? <img src={facility.imageUrl} alt={facility.name} className="w-full h-full object-cover" /> : <Building2 className="w-12 h-12 text-slate-700" />}
      </div>
      <div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-white font-black text-lg leading-tight">{facility.name}</h3>
          {canManage && onEdit && (
            <button
              type="button"
              onClick={() => onEdit(facility)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 text-[11px] font-black flex items-center gap-1.5 shrink-0"
            >
              <Pencil className="w-3.5 h-3.5" />
              수정
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">{facility.description}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold">
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-indigo-400" />
          {facility.location}
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-400" />
          최대 {facility.capacity}명
        </div>
      </div>
      <div className={`rounded-2xl border p-4 text-xs font-black flex items-center gap-2 ${reservable ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-rose-500/10 border-rose-500/25 text-rose-400'}`}>
        <CheckCircle2 className="w-4 h-4" />
        {reservable ? '주요 일정 등록 가능' : '현재 주요 일정 등록 불가'}
      </div>
    </div>
  );
}
