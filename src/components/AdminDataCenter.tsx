import React, { useEffect, useMemo, useState } from 'react';
import {
  ClipboardList,
  Database,
  Download,
  FileText,
  HardDrive,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
} from 'lucide-react';
import type { FacilityAppState } from '../types';
import {
  buildCompletedWorkCsv,
  buildCompletedWorkRecords,
  formatAdminRecordDateTime,
} from '../lib/adminCompletionRecords';
import { getErrorMessage } from '../lib/errors';
import {
  getSupabaseStateConfig,
  getSupabaseStateHealth,
  loadSupabaseState,
  saveSupabaseState,
} from '../lib/supabaseState';

interface AdminDataCenterProps {
  createSnapshot: () => FacilityAppState;
  onApplySnapshot: (snapshot: FacilityAppState) => void;
  addToast: (title: string, message: string, avatar?: string) => void;
  isAdmin: boolean;
}

interface ServerHealth {
  ok: boolean;
  mode?: string;
  savedAt?: string;
  taskCount?: number;
  facilityCount?: number;
  reservationCount?: number;
  maintenanceCount?: number;
  storagePath?: string;
}

const downloadTextFile = (fileName: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const buildEmptyOperationalSnapshot = (snapshot: FacilityAppState): FacilityAppState => ({
  ...snapshot,
  exportedAt: new Date().toISOString(),
  tasks: [],
  notifications: [],
  dailyLogs: [],
  syncedTaskIds: [],
  facilityModule: snapshot.facilityModule
    ? {
        ...snapshot.facilityModule,
        facilities: [],
        reservations: [],
        maintenanceRequests: [],
        inspectionSchedules: [],
        assets: [],
        notifications: [],
        userAccess: snapshot.facilityModule.userAccess,
      }
    : snapshot.facilityModule,
});

export default function AdminDataCenter({
  createSnapshot,
  onApplySnapshot,
  addToast,
  isAdmin,
}: AdminDataCenterProps) {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('전체');
  const [health, setHealth] = useState<ServerHealth | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const supabaseConfig = getSupabaseStateConfig();
  const useSupabase = supabaseConfig.enabled;

  const snapshot = createSnapshot();
  const completedRecords = useMemo(() => buildCompletedWorkRecords(snapshot), [snapshot]);
  const sourceOptions = useMemo(
    () => ['전체', ...Array.from(new Set(completedRecords.map((record) => record.workType)))],
    [completedRecords],
  );
  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return completedRecords.filter((record) => {
      const matchesSource = source === '전체' || record.workType === source;
      const searchableText = [
        record.workType,
        record.title,
        record.owner,
        record.location,
        record.detail,
      ].join(' ').toLowerCase();
      return matchesSource && (!normalizedQuery || searchableText.includes(normalizedQuery));
    });
  }, [completedRecords, query, source]);

  const completedTasks = snapshot.tasks.filter((task) => task.status === '완료').length;
  const completedDailyLogs = snapshot.dailyLogs.filter(
    (log) => log.eveningStatus === '완료' && Boolean(log.eveningResult.trim()),
  ).length;
  const module = snapshot.facilityModule;
  const counts = [
    { label: '완료 업무지정', value: completedTasks },
    { label: '완료 근무일지', value: completedDailyLogs },
    { label: '업무 완료 목록', value: completedRecords.length },
    { label: '시설', value: module?.facilities.length ?? 0 },
    { label: '대관 일정', value: module?.reservations.length ?? 0 },
    { label: '자산', value: module?.assets.length ?? 0 },
  ];

  const checkServer = async () => {
    setChecking(true);
    try {
      if (useSupabase) {
        const data = await getSupabaseStateHealth();
        setHealth(data);
        return;
      }

      const response = await fetch('/api/health', { cache: 'no-store' });
      if (!response.ok) throw new Error('공용 저장소 응답이 없습니다.');
      const data = (await response.json()) as ServerHealth;
      setHealth(data);
    } catch {
      setHealth(null);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    void checkServer();
  }, []);

  const saveToServer = async () => {
    if (!isAdmin) {
      addToast('관리자 권한 필요', '전체 데이터 서버 저장은 관리자만 사용할 수 있습니다.', '🔒');
      return;
    }

    const confirmed = window.confirm('현재 화면의 모든 작성 내용을 팀원 공용 저장소에 저장할까요? 기존 서버 파일은 현재 내용으로 갱신됩니다.');
    if (!confirmed) return;

    setSaving(true);
    try {
      const currentSnapshot = createSnapshot();
      if (useSupabase) {
        const result = await saveSupabaseState(currentSnapshot, 'admin data center');
        setHealth(result);
        addToast('온라인 저장 완료', '현재 작성 내용 전체를 Supabase 공용 저장소에 저장했습니다.', '✅');
        return;
      }

      const response = await fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentSnapshot),
      });
      if (!response.ok) throw new Error('서버 저장에 실패했습니다.');
      const result = (await response.json()) as ServerHealth;
      setHealth(result);
      addToast('서버 저장 완료', '현재 작성 내용 전체를 팀원 공용 저장소에 저장했습니다.', '✅');
    } catch (error) {
      addToast('서버 저장 실패', getErrorMessage(error, '서버 저장 중 문제가 발생했습니다.'), '⚠️');
    } finally {
      setSaving(false);
    }
  };

  const loadFromServer = async () => {
    if (!isAdmin) {
      addToast('관리자 권한 필요', '서버 데이터 불러오기는 관리자만 사용할 수 있습니다.', '🔒');
      return;
    }

    const confirmed = window.confirm('팀원 공용 저장소에 저장된 데이터로 현재 화면 내용을 바꿀까요?');
    if (!confirmed) return;

    setLoading(true);
    try {
      if (useSupabase) {
        const result = await loadSupabaseState();
        if (!result.hasState || !result.state) {
          addToast('온라인 데이터 없음', '아직 Supabase 공용 저장소에 저장된 데이터가 없습니다.', 'ℹ️');
          return;
        }
        onApplySnapshot(result.state);
        setHealth({
          ok: true,
          mode: 'supabase',
          savedAt: result.savedAt,
          storagePath: supabaseConfig.url,
          taskCount: result.state.tasks?.length ?? 0,
          facilityCount: result.state.facilityModule?.facilities?.length ?? 0,
          reservationCount: result.state.facilityModule?.reservations?.length ?? 0,
        });
        addToast('온라인 데이터 반영 완료', 'Supabase 공용 저장소의 내용을 현재 화면에 불러왔습니다.', '✅');
        return;
      }

      const response = await fetch('/api/state', { cache: 'no-store' });
      if (!response.ok) throw new Error('서버 데이터를 불러오지 못했습니다.');
      const result = await response.json();
      if (!result.hasState || !result.state) {
        addToast('서버 데이터 없음', '아직 팀원 공용 저장소에 저장된 데이터가 없습니다.', 'ℹ️');
        return;
      }
      onApplySnapshot(result.state as FacilityAppState);
      setHealth({
        ok: true,
        savedAt: result.savedAt,
        storagePath: result.storagePath,
        taskCount: result.state.tasks?.length ?? 0,
        facilityCount: result.state.facilityModule?.facilities?.length ?? 0,
        reservationCount: result.state.facilityModule?.reservations?.length ?? 0,
      });
      addToast('서버 데이터 반영 완료', '팀원 공용 저장소의 내용을 현재 화면에 불러왔습니다.', '✅');
    } catch (error) {
      addToast('서버 불러오기 실패', getErrorMessage(error, '서버 데이터를 읽는 중 문제가 발생했습니다.'), '⚠️');
    } finally {
      setLoading(false);
    }
  };

  const downloadBackup = () => {
    const currentSnapshot = createSnapshot();
    downloadTextFile(
      `시설관리_전체백업_${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(currentSnapshot, null, 2),
      'application/json;charset=utf-8;',
    );
    addToast('전체 백업 다운로드', '현재 작성 내용 전체를 JSON 백업 파일로 내려받았습니다.', '📦');
  };

  const downloadCsv = () => {
    downloadTextFile(
      `시설관리_업무완료목록_${new Date().toISOString().slice(0, 10)}.csv`,
      `\uFEFF${buildCompletedWorkCsv(filteredRecords)}`,
      'text/csv;charset=utf-8;',
    );
    addToast('CSV 다운로드 완료', '완료된 업무 목록을 CSV 파일로 내려받았습니다.', '📄');
  };

  const resetTestData = async () => {
    if (!isAdmin) {
      addToast('관리자 권한 필요', '테스트 데이터 초기화는 관리자만 사용할 수 있습니다.', '🔒');
      return;
    }

    const typed = window.prompt(
      '테스트 데이터를 초기화합니다. 업무지정, 근무일지, 알림, 시설/일정/자산 데이터가 비워집니다.\n계속하려면 초기화 라고 입력하세요.',
    );
    if (typed !== '초기화') return;

    const resetSnapshot = buildEmptyOperationalSnapshot(createSnapshot());
    setResetting(true);
    try {
      onApplySnapshot(resetSnapshot);

      if (useSupabase) {
        const result = await saveSupabaseState(resetSnapshot, 'reset test data');
        setHealth(result);
        addToast('초기화 완료', '테스트 데이터를 비우고 Supabase 공용 저장소에도 저장했습니다.', '✅');
        return;
      }

      addToast('초기화 완료', '현재 화면의 테스트 데이터를 비웠습니다. 공용 저장소에 반영하려면 서버 저장을 눌러주세요.', '✅');
    } catch (error) {
      addToast('초기화 실패', getErrorMessage(error, '테스트 데이터 초기화 중 문제가 발생했습니다.'), '⚠️');
    } finally {
      setResetting(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="bg-slate-900/80 border border-slate-700 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-indigo-200">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-sm font-semibold">관리자 데이터 화면</span>
            </div>
            <h2 className="text-white text-2xl font-semibold mt-2">작성 내용 확인 및 서버 저장</h2>
            <p className="text-slate-300 text-sm leading-relaxed mt-2 max-w-3xl">
              이 화면은 전체 데이터 저장 상태를 확인하고, 완료된 업무만 별도로 모아 보고자료용 목록으로 내려받는 관리자 화면입니다.
              서버 저장은 팀원 공용 저장소의 JSON 파일을 현재 내용으로 갱신하고, 업무 완료 목록 CSV는 완료된 업무만 정리합니다.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 min-w-0 xl:min-w-[560px]">
            {counts.map((item) => (
              <div key={item.label} className="rounded-2xl bg-slate-950 border border-slate-800 px-3 py-3">
                <p className="text-[11px] text-slate-400 font-semibold">{item.label}</p>
                <p className="text-xl text-white font-semibold mt-1">{item.value.toLocaleString('ko-KR')}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-slate-900/75 border border-slate-800 rounded-3xl p-5">
          <div className="flex items-center gap-2 text-emerald-300">
            <HardDrive className="w-5 h-5" />
            <h3 className="text-white text-base font-semibold">저장 방식</h3>
          </div>
          <div className="mt-4 space-y-3 text-sm text-slate-300 leading-relaxed">
            <p>1. 내용을 입력하면 먼저 현재 브라우저에 자동 저장됩니다.</p>
            <p>2. <span className="text-emerald-300">{useSupabase ? '현재 데이터 공용 저장' : '현재 데이터 서버 저장'}</span>을 누르면 팀원 공용 저장소에 저장됩니다.</p>
            <p>3. 업무 완료 목록은 서버 전체 데이터 중 완료 업무만 추려서 보여줍니다.</p>
          </div>
        </div>

        <div className="bg-slate-900/75 border border-slate-800 rounded-3xl p-5 lg:col-span-2">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-300" />
                <h3 className="text-white text-base font-semibold">{useSupabase ? '온라인 공용 저장소 상태' : '팀원 공용 저장소 상태'}</h3>
              </div>
              <p className="text-sm text-slate-300 mt-2">
                마지막 저장: <span className="text-white">{formatAdminRecordDateTime(health?.savedAt)}</span>
              </p>
              <p className="text-xs text-emerald-300 mt-1 break-all">
                저장 위치: {health?.storagePath || (useSupabase ? 'Supabase 연결 확인 후 표시됩니다.' : '서버 실행 후 확인 가능합니다.')}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={checkServer}
                disabled={checking}
                className="px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm font-semibold flex items-center gap-2 disabled:text-slate-500"
              >
                <RefreshCw className={`w-4 h-4 text-indigo-300 ${checking ? 'animate-spin' : ''}`} />
                상태 확인
              </button>
              <button
                type="button"
                onClick={loadFromServer}
                disabled={loading || !isAdmin}
                className="px-4 py-3 rounded-xl bg-slate-950 border border-amber-500/30 text-slate-100 text-sm font-semibold flex items-center gap-2 disabled:text-slate-500 disabled:border-slate-800"
              >
                <Download className="w-4 h-4 text-amber-300" />
                {loading ? '불러오는 중' : '서버에서 불러오기'}
              </button>
              <button
                type="button"
                onClick={saveToServer}
                disabled={saving || !isAdmin}
                className="px-4 py-3 rounded-xl bg-emerald-600/25 border border-emerald-500/40 text-emerald-100 text-sm font-semibold flex items-center gap-2 disabled:text-slate-500 disabled:border-slate-800 disabled:bg-slate-900"
              >
                <Save className="w-4 h-4" />
                {saving ? '저장 중' : useSupabase ? '현재 데이터 공용 저장' : '현재 데이터 서버 저장'}
              </button>
              <button
                type="button"
                onClick={resetTestData}
                disabled={resetting || !isAdmin}
                className="px-4 py-3 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-100 text-sm font-semibold flex items-center gap-2 disabled:text-slate-500 disabled:border-slate-800 disabled:bg-slate-900"
              >
                <RotateCcw className="w-4 h-4" />
                {resetting ? '초기화 중' : '테스트 데이터 초기화'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/75 border border-slate-800 rounded-3xl p-5 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-300" />
              <h3 className="text-white text-lg font-semibold">시설관리팀 단위 업무별 결과</h3>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              업무 지정과 담당자 자율 등록 업무를 같은 기준으로 모아 검색하고 내려받습니다.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
            <div className="relative sm:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="제목, 담당자, 시설, 업무내용 검색"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm outline-none focus:border-indigo-400"
              />
            </div>
            <select
              value={source}
              onChange={(event) => setSource(event.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm outline-none focus:border-indigo-400"
            >
              {sourceOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={downloadCsv}
              disabled={filteredRecords.length === 0}
              className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm font-semibold flex items-center justify-center gap-2 disabled:text-slate-600"
            >
              <FileText className="w-4 h-4 text-emerald-300" />
              CSV 다운로드
            </button>
            <button
              type="button"
              onClick={downloadBackup}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              전체 백업
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <div className="max-h-[560px] overflow-auto">
              <table className="w-full min-w-[1280px] text-left text-sm">
              <colgroup>
                <col className="w-[150px]" />
                <col className="w-[140px]" />
                <col className="w-[180px]" />
                <col className="w-[180px]" />
                <col className="w-[240px]" />
                <col className="w-[110px]" />
                <col className="w-[210px]" />
                <col />
              </colgroup>
              <thead className="sticky top-0 bg-slate-950 text-slate-300 z-10">
                <tr className="border-b border-slate-800">
                  <th className="px-4 py-3 font-semibold">출발점</th>
                  <th className="px-4 py-3 font-semibold">업무구분</th>
                  <th className="px-4 py-3 font-semibold">시작일시</th>
                  <th className="px-4 py-3 font-semibold">완료일시</th>
                  <th className="px-4 py-3 font-semibold">제목</th>
                  <th className="px-4 py-3 font-semibold">담당자</th>
                  <th className="px-4 py-3 font-semibold">시설/위치</th>
                  <th className="px-4 py-3 font-semibold">업무내용</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/55">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                      완료된 업무 기록이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-900/80">
                      <td className="px-4 py-3">
                        <span className={`inline-flex whitespace-nowrap rounded-lg border px-3 py-1 text-xs font-semibold ${
                          record.origin === '업무 지정'
                            ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-200'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                        }`}>
                          {record.origin}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex whitespace-nowrap rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 px-3 py-1 text-xs font-semibold">
                          {record.workType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                        {formatAdminRecordDateTime(record.startedAt)}
                      </td>
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                        {formatAdminRecordDateTime(record.completedAt)}
                      </td>
                      <td className="px-4 py-3 text-white font-semibold max-w-[260px]">{record.title}</td>
                      <td className="px-4 py-3 text-slate-300">{record.owner || '-'}</td>
                      <td className="px-4 py-3 text-slate-300">{record.location || '-'}</td>
                      <td className="px-4 py-3 text-slate-400 max-w-[420px] whitespace-pre-line">{record.detail || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-emerald-100">
            CSV는 업무 완료 목록만 내려받으므로 실적 자료로 바로 정리하기 쉽습니다.
          </div>
          <div className="rounded-2xl bg-indigo-500/10 border border-indigo-500/20 px-4 py-3 text-indigo-100">
            전체 백업은 사진 데이터까지 포함할 수 있어 시스템 복원용으로 보관합니다.
          </div>
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-amber-100">
            서버 저장은 업무 완료 목록만이 아니라 현재 시스템 전체 데이터를 저장합니다.
          </div>
        </div>
      </div>
    </section>
  );
}
