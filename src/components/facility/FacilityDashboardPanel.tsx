import React, { useMemo } from 'react';
import { Activity, BarChart3, CalendarDays, Gauge } from 'lucide-react';
import { buildFacilityDashboardStats } from '../../facility/dashboardStats';
import { Facility, FacilityReservation } from '../../facility/types';

interface FacilityDashboardPanelProps {
  facilities: Facility[];
  reservations: FacilityReservation[];
}

export default function FacilityDashboardPanel({
  facilities,
  reservations,
}: FacilityDashboardPanelProps) {
  const stats = useMemo(() => buildFacilityDashboardStats(
    facilities,
    reservations,
  ), [facilities, reservations]);

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard icon={CalendarDays} label="오늘 주요 일정" value={`${stats.todayReservationCount}건`} tone="indigo" />
        <MetricCard icon={Gauge} label="시설 이용률" value={`${stats.facilityUtilizationRate}%`} tone="emerald" />
        <MetricCard icon={Activity} label="등록 시설" value={`${facilities.length}개`} tone="slate" />
      </div>
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5">
        <h3 className="text-white font-black text-sm flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-indigo-400" />
          월별 주요 일정 통계
        </h3>
        <MonthlyBarChart data={stats.monthlyReservationStats} />
      </div>
    </section>
  );
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: 'indigo' | 'emerald' | 'slate';
}

const toneClass = {
  indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25',
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  slate: 'bg-slate-950 text-slate-400 border-slate-800',
};

function MetricCard({ icon: Icon, label, value, tone }: MetricCardProps) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 flex items-center gap-4">
      <div className={`p-3 rounded-2xl border ${toneClass[tone]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{label}</p>
        <p className="text-2xl text-white font-black mt-1">{value}</p>
      </div>
    </div>
  );
}

interface MonthlyBarChartProps {
  data: { key: string; label: string; count: number }[];
}

function MonthlyBarChart({ data }: MonthlyBarChartProps) {
  const maxCount = Math.max(1, ...data.map((item) => item.count));

  return (
    <div className="h-56 flex items-end gap-3 sm:gap-4">
      {data.map((item) => (
        <div key={item.key} className="flex-1 min-w-0 flex flex-col items-center gap-2">
          <div className="text-[10px] text-slate-400 font-black">{item.count}</div>
          <div className="w-full h-36 flex items-end rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
            <div
              className="w-full bg-indigo-500/80 rounded-t-xl transition-all"
              style={{ height: `${Math.max(8, (item.count / maxCount) * 100)}%` }}
              aria-label={`${item.label} 예약 ${item.count}건`}
            />
          </div>
          <div className="text-[10px] text-slate-500 font-black truncate">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
