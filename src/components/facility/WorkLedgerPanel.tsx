import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { buildWorkLedgerCsv } from '../../facility/workLedgerCsv';
import type { FacilityRole, WorkLedgerEntry, WorkLedgerSource } from '../../facility/types';

interface WorkLedgerPanelProps {
  entries: WorkLedgerEntry[];
  role: FacilityRole;
}

const PAGE_SIZE = 8;

const formatDate = (date: string) => new Date(date).toLocaleDateString('ko-KR');

export default function WorkLedgerPanel({ entries, role }: WorkLedgerPanelProps) {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<WorkLedgerSource | '전체'>('전체');
  const [page, setPage] = useState(1);
  const isAdmin = role === 'admin';

  const sourceOptions = useMemo<(WorkLedgerSource | '전체')[]>(() => (
    ['전체', ...Array.from(new Set(entries.map((entry) => entry.source)))]
  ), [entries]);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesSource = source === '전체' || entry.source === source;
      const searchableText = [
        entry.title,
        entry.unitName,
        entry.category,
        entry.status,
        entry.description,
        entry.facilityName,
        entry.location,
        entry.assignee,
      ].join(' ').toLowerCase();
      return matchesSource && (!normalizedQuery || searchableText.includes(normalizedQuery));
    });
  }, [entries, query, source]);

  const pageCount = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const pageItems = filteredEntries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query, source]);

  const downloadCsv = () => {
    const csv = buildWorkLedgerCsv(filteredEntries);
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `업무실적_누적대장_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-4">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h3 className="text-white font-black text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            업무실적 누적대장
          </h3>
          <p className="text-[11px] text-slate-500 font-bold mt-1">
            업무 지정과 담당자 자율 등록으로 처리된 내용을 단위업무·증빙 기준으로 누적합니다.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
          <div className="relative sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="업무명, 시설, 담당자 검색"
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-[11px] font-bold outline-none focus:border-emerald-400"
            />
          </div>
          <select
            value={source}
            onChange={(event) => setSource(event.target.value as WorkLedgerSource | '전체')}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-[11px] font-black outline-none focus:border-emerald-400"
          >
            {sourceOptions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          {isAdmin && (
            <button
              type="button"
              onClick={downloadCsv}
              disabled={filteredEntries.length === 0}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-[11px] font-black flex items-center gap-1.5 disabled:text-slate-600 disabled:cursor-not-allowed w-max"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              CSV 내보내기
            </button>
          )}
        </div>
      </div>

      {pageItems.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center text-slate-500 text-xs font-bold">
          누적할 업무 기록이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {pageItems.map((entry) => (
            <article key={entry.id} className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-1 rounded-lg bg-slate-900 text-slate-400 text-[10px] font-black">
                      {entry.source}
                    </span>
                  </div>
                  <h4 className="text-white text-sm font-black mt-2">{entry.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 font-bold">
                    {entry.category} / {entry.unitName}
                  </p>
                </div>
                <div className="text-left lg:text-right text-[11px] text-slate-500 font-bold">
                  <p>{formatDate(entry.date)}</p>
                  <p className="mt-1 text-slate-300">{entry.status}</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{entry.description}</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-400 font-bold">
                <span>담당: {entry.assignee || '미지정'}</span>
                <span>시설/위치: {entry.facilityName || entry.location || '미기록'}</span>
                <span>증빙: {entry.evidence}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 text-xs font-black">
        <span className="text-slate-500">
          {filteredEntries.length.toLocaleString('ko-KR')}건 / {page} / {pageCount} 페이지
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 disabled:text-slate-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={page === pageCount}
            onClick={() => setPage(page + 1)}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 disabled:text-slate-700"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
