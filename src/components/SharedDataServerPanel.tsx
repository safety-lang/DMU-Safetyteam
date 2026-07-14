import React, { useEffect, useState } from 'react';
import { Copy, Database, Download, RefreshCw, Share2, Smartphone, Upload } from 'lucide-react';
import { FacilityAppState } from '../types';
import { getErrorMessage } from '../lib/errors';
import {
  getSupabaseStateConfig,
  getSupabaseStateHealth,
  loadSupabaseState,
  saveSupabaseState,
} from '../lib/supabaseState';

interface SharedDataServerPanelProps {
  createSnapshot: () => FacilityAppState;
  onApplySnapshot: (snapshot: FacilityAppState) => void;
  addToast: (title: string, message: string, avatar?: string) => void;
}

interface ServerHealth {
  ok: boolean;
  mode: string;
  savedAt?: string;
  taskCount?: number;
  facilityCount?: number;
  reservationCount?: number;
  storagePath?: string;
}

interface AccessInfo {
  ok: boolean;
  port: number;
  localUrl: string;
  urls: string[];
  recommendedUrls?: string[];
  otherUrls?: string[];
  hasRecommendedUrl?: boolean;
}

const formatSavedAt = (value?: string) => {
  if (!value) return '저장 기록 없음';
  return new Date(value).toLocaleString('ko-KR');
};

export default function SharedDataServerPanel({
  createSnapshot,
  onApplySnapshot,
  addToast,
}: SharedDataServerPanelProps) {
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<ServerHealth | null>(null);
  const [accessInfo, setAccessInfo] = useState<AccessInfo | null>(null);
  const supabaseConfig = getSupabaseStateConfig();
  const useSupabase = supabaseConfig.enabled;

  const recommendedMobileUrls = accessInfo?.recommendedUrls ?? [];
  const otherMobileUrls = accessInfo?.otherUrls ?? [];
  const mobileUrls = recommendedMobileUrls.length > 0 ? recommendedMobileUrls : [];

  const checkServer = async () => {
    setChecking(true);
    try {
      if (useSupabase) {
        const data = await getSupabaseStateHealth();
        setHealth(data);
        setAvailable(true);
        return;
      }

      const response = await fetch('/api/health', { cache: 'no-store' });
      if (!response.ok) throw new Error('공유 서버 응답이 없습니다.');
      const data = (await response.json()) as ServerHealth;
      setHealth(data);
      setAvailable(Boolean(data.ok));
    } catch {
      setHealth(null);
      setAvailable(false);
    } finally {
      setChecking(false);
    }
  };

  const loadAccessInfo = async () => {
    if (useSupabase) {
      setAccessInfo(null);
      return;
    }

    try {
      const response = await fetch('/api/access-info', { cache: 'no-store' });
      if (!response.ok) throw new Error('access info unavailable');
      const data = (await response.json()) as AccessInfo;
      setAccessInfo(data);
    } catch {
      setAccessInfo(null);
    }
  };

  useEffect(() => {
    void checkServer();
    void loadAccessInfo();
  }, []);

  const copyMobileUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      addToast('스마트폰 접속 주소 복사', '팀원에게 이 주소를 보내면 같은 Wi-Fi에서 접속할 수 있습니다.', '📱');
    } catch {
      addToast('복사 실패', '주소를 직접 선택해서 복사해 주세요.', '⚠️');
    }
  };

  const shareMobileUrl = async (url: string) => {
    if (!navigator.share) {
      await copyMobileUrl(url);
      return;
    }

    try {
      await navigator.share({
        title: '시설관리팀 시스템 접속 주소',
        text: '시설관리팀 시스템 스마트폰 접속 주소입니다.',
        url,
      });
    } catch {
      // The user may cancel the native share sheet.
    }
  };

  const saveToServer = async () => {
    if (!available) {
      addToast(
        '공용 저장소 연결 안 됨',
        useSupabase ? 'Supabase 연결값을 확인해 주세요.' : '팀원 공용 저장소를 쓰려면 start-team-share.cmd로 실행해 주세요.',
        '🔒',
      );
      return;
    }

    const confirmed = window.confirm('현재 브라우저의 데이터를 팀원 공용 저장소에 저장하시겠습니까?');
    if (!confirmed) return;

    setSaving(true);
    try {
      const snapshot = createSnapshot();
      if (useSupabase) {
        const result = await saveSupabaseState(snapshot);
        setHealth(result);
        addToast('Supabase 저장 완료', '현재 운영 데이터를 온라인 공용 저장소에 저장했습니다.', '✅');
        return;
      }

      const response = await fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
      });
      if (!response.ok) throw new Error('서버 저장에 실패했습니다.');
      const result = (await response.json()) as ServerHealth;
      setHealth((prev) => ({
        ok: true,
        mode: 'shared-server',
        savedAt: result.savedAt,
        taskCount: snapshot.tasks.length,
        facilityCount: snapshot.facilityModule?.facilities.length || 0,
        reservationCount: snapshot.facilityModule?.reservations.length || 0,
        storagePath: result.storagePath || prev?.storagePath,
      }));
      addToast('공유 저장 완료', '현재 운영 데이터를 팀원 공용 저장소에 저장했습니다.', '✅');
    } catch (error) {
      addToast('공유 저장 실패', getErrorMessage(error, '서버 저장 중 문제가 발생했습니다.'), '⚠️');
    } finally {
      setSaving(false);
    }
  };

  const loadFromServer = async () => {
    if (!available) {
      addToast(
        '공용 저장소 연결 안 됨',
        useSupabase ? 'Supabase 연결값을 확인해 주세요.' : '팀원 공용 저장소를 쓰려면 start-team-share.cmd로 실행해 주세요.',
        '🔒',
      );
      return;
    }

    const confirmed = window.confirm('팀원 공용 저장소의 데이터로 현재 화면 데이터를 교체하시겠습니까?');
    if (!confirmed) return;

    setLoading(true);
    try {
      if (useSupabase) {
        const result = await loadSupabaseState();
        if (!result.hasState || !result.state) {
          addToast('공유 데이터 없음', '아직 Supabase 공용 저장소에 저장된 데이터가 없습니다.', 'ℹ️');
          return;
        }

        onApplySnapshot(result.state);
        setHealth((prev) => ({
          ok: true,
          mode: 'supabase',
          savedAt: result.savedAt || prev?.savedAt,
          taskCount: result.state.tasks?.length || 0,
          facilityCount: result.state.facilityModule?.facilities?.length || 0,
          reservationCount: result.state.facilityModule?.reservations?.length || 0,
          storagePath: prev?.storagePath,
        }));
        addToast('Supabase 불러오기 완료', '온라인 공용 저장소의 최신 데이터를 화면에 반영했습니다.', '✅');
        return;
      }

      const response = await fetch('/api/state', { cache: 'no-store' });
      if (!response.ok) throw new Error('서버 데이터를 불러오지 못했습니다.');
      const result = await response.json();
      if (!result.hasState || !result.state) {
        addToast('공유 데이터 없음', '아직 팀원 공용 저장소에 저장된 데이터가 없습니다.', 'ℹ️');
        return;
      }
      onApplySnapshot(result.state as FacilityAppState);
      setHealth((prev) => ({
        ok: true,
        mode: 'shared-server',
        savedAt: result.savedAt || prev?.savedAt,
        taskCount: result.state.tasks?.length || 0,
        facilityCount: result.state.facilityModule?.facilities?.length || 0,
        reservationCount: result.state.facilityModule?.reservations?.length || 0,
        storagePath: result.storagePath || prev?.storagePath,
      }));
      addToast('공유 데이터 불러오기 완료', '팀원 공용 저장소의 최신 데이터를 화면에 반영했습니다.', '✅');
    } catch (error) {
      addToast('공유 데이터 불러오기 실패', getErrorMessage(error, '서버 데이터를 읽는 중 문제가 발생했습니다.'), '⚠️');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/85 border border-slate-700/80 rounded-3xl p-4 sm:p-6 shadow-xl flex flex-col xl:flex-row xl:items-center justify-between gap-5">
      <div className="flex flex-col lg:flex-row lg:items-start gap-4 min-w-0">
        <div className={`p-4 rounded-2xl border ${available ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-slate-950 border-slate-700 text-slate-400'}`}>
          <Database className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <h2 className="text-white font-black text-lg tracking-tight flex items-center gap-2">
            {useSupabase ? '온라인 공용 저장소' : '팀원 공용 저장소'}
            {available ? (
              <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-lg font-black tracking-widest">
                연결됨
              </span>
            ) : (
              <span className="bg-slate-800 text-slate-300 border border-slate-700 text-xs px-2.5 py-1 rounded-lg font-black tracking-widest">
                로컬 저장
              </span>
            )}
          </h2>
          <p className="text-sm text-slate-200 mt-1.5 font-semibold leading-relaxed">
            {available
              ? `마지막 저장: ${formatSavedAt(health?.savedAt)}`
              : '현재는 이 브라우저에만 저장됩니다. 팀원 공용 데이터는 start-team-share.cmd 실행 시 사용할 수 있습니다.'}
          </p>
          {available && (
            <div className="space-y-1 mt-1.5">
              <p className="text-xs text-slate-400 font-bold">
                저장 데이터: 업무지정 {health?.taskCount ?? 0}건 · 시설 {health?.facilityCount ?? 0}개 · 주요 일정 {health?.reservationCount ?? 0}건
              </p>
              {health?.storagePath && (
                <p className="text-xs text-emerald-300 font-bold break-all">
                  {useSupabase ? 'Supabase 위치' : '저장 위치'}: {health.storagePath}
                </p>
              )}
            </div>
          )}

          {available && useSupabase && (
            <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 sm:p-4">
              <div className="flex items-center gap-2 text-emerald-100">
                <Smartphone className="w-4 h-4 text-emerald-300" />
                <span className="text-sm font-black">팀원 접속 주소</span>
              </div>
              <p className="mt-1 text-xs text-slate-300 font-semibold leading-relaxed">
                팀원과 스마트폰에서는 Vercel 주소로 접속합니다. 저장/불러오기 버튼은 Supabase 공용 저장소와 연결됩니다.
              </p>
              <code className="mt-3 block break-all rounded-xl border border-slate-700/80 bg-slate-950/80 p-3 text-xs text-emerald-200">
                {window.location.origin}
              </code>
            </div>
          )}

          {available && !useSupabase && (
            <div className="mt-4 rounded-2xl border border-indigo-500/25 bg-indigo-500/10 p-3 sm:p-4">
              <div className="flex items-center gap-2 text-indigo-100">
                <Smartphone className="w-4 h-4 text-indigo-300" />
                <span className="text-sm font-black">스마트폰 접속 주소</span>
              </div>
              <p className="mt-1 text-xs text-slate-300 font-semibold leading-relaxed">
                휴대폰을 컴퓨터와 같은 Wi-Fi에 연결한 뒤 아래 주소로 접속하세요. 처음 여는 휴대폰은 서버 저장 데이터를 자동으로 한 번 불러옵니다.
              </p>
              <div className="mt-3 space-y-2">
                {mobileUrls.length > 0 ? (
                  mobileUrls.slice(0, 3).map((url) => (
                    <div key={url} className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/80 p-2">
                      <code className="min-w-0 flex-1 break-all px-2 text-xs text-emerald-200">{url}</code>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => copyMobileUrl(url)}
                          className="flex-1 sm:flex-none px-3 py-2 rounded-lg border border-slate-700 text-xs font-black text-slate-100 hover:border-indigo-400 hover:text-white"
                        >
                          <Copy className="inline-block w-3.5 h-3.5 mr-1" />
                          복사
                        </button>
                        <button
                          type="button"
                          onClick={() => shareMobileUrl(url)}
                          className="flex-1 sm:flex-none px-3 py-2 rounded-lg border border-slate-700 text-xs font-black text-slate-100 hover:border-emerald-400 hover:text-white"
                        >
                          <Share2 className="inline-block w-3.5 h-3.5 mr-1" />
                          공유
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-100 font-semibold leading-relaxed">
                    스마트폰에서 바로 쓰기 좋은 같은-Wi-Fi 내부 주소를 찾지 못했습니다.
                    PC와 스마트폰이 서로 다른 학교망/유선망/무선망에 있거나 방화벽이 막고 있을 수 있습니다.
                    PC를 스마트폰 핫스팟에 연결하거나, 학교 Wi-Fi에서 PC와 스마트폰이 같은 네트워크에 있는지 확인해 주세요.
                  </div>
                )}
              </div>
              {otherMobileUrls.length > 0 && (
                <div className="mt-3 rounded-xl border border-slate-700/80 bg-slate-950/70 p-3">
                  <p className="text-[11px] text-slate-400 font-black">참고 주소 - 학교망/방화벽에서 막힐 수 있음</p>
                  <div className="mt-2 space-y-1">
                    {otherMobileUrls.slice(0, 3).map((url) => (
                      <code key={url} className="block break-all text-[11px] text-slate-300">
                        {url}
                      </code>
                    ))}
                  </div>
                </div>
              )}
              <p className="mt-2 text-[11px] text-slate-400 font-semibold leading-relaxed">
                접속이 안 되면 서버 창을 닫지 않았는지, 휴대폰과 컴퓨터가 같은 네트워크인지, Windows 방화벽에서 허용했는지 확인해 주세요.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row xl:flex-col 2xl:flex-row items-stretch sm:items-center xl:items-stretch 2xl:items-center justify-end gap-3 w-full xl:w-auto">
        <button
          type="button"
          onClick={checkServer}
          disabled={checking}
          className="px-4 py-3 rounded-xl border text-sm font-black flex items-center justify-center gap-2 bg-slate-950 text-slate-100 border-slate-700 hover:border-indigo-500/50 hover:text-white disabled:text-slate-500 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 text-indigo-400 ${checking ? 'animate-spin' : ''}`} />
          <span>상태 확인</span>
        </button>
        <button
          type="button"
          onClick={loadFromServer}
          disabled={!available || loading}
          className={`px-4 py-3 rounded-xl border text-sm font-black flex items-center justify-center gap-2 ${
            available && !loading
              ? 'bg-slate-950 text-slate-100 border-slate-700 hover:border-amber-500/50 hover:text-white cursor-pointer'
              : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
          }`}
        >
          <Download className="w-4 h-4 text-amber-400" />
          <span>{loading ? '불러오는 중' : '서버에서 불러오기'}</span>
        </button>
        <button
          type="button"
          onClick={saveToServer}
          disabled={!available || saving}
          className={`px-4 py-3 rounded-xl border text-sm font-black flex items-center justify-center gap-2 ${
            available && !saving
              ? 'bg-emerald-600/25 text-emerald-100 border-emerald-500/40 hover:bg-emerald-600/35 cursor-pointer'
              : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>{saving ? '저장 중' : '현재 데이터 공용 저장'}</span>
        </button>
      </div>
    </div>
  );
}
