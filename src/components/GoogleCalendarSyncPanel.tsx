import React, { useEffect, useRef, useState } from 'react';
import {
  FACILITY_SHARED_CALENDAR_ID,
  FACILITY_SHARED_CALENDAR_NAME,
  SHARED_CALENDAR_AUTO_SYNC_KEY,
  isAppsScriptWebAppUrl,
  syncTaskToGoogleCalendar,
} from '../lib/googleCalendar';
import { Task } from '../types';
import {
  AlertCircle,
  Calendar,
  Check,
  ExternalLink,
  KeyRound,
  Link,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { getErrorMessage } from '../lib/errors';

interface GoogleCalendarSyncPanelProps {
  tasks: Task[];
  addToast: (title: string, message: string, avatar?: string) => void;
  onTasksSynced: (syncedIds: string[]) => void;
  syncedTaskIds: string[];
  webAppUrl: string;
  webhookSecret: string;
  onWebAppUrlChange: (value: string) => void;
  onWebhookSecretChange: (value: string) => void;
  onSettingsSave?: (webAppUrl: string, webhookSecret: string) => void;
}

export default function GoogleCalendarSyncPanel({
  tasks,
  addToast,
  onTasksSynced,
  syncedTaskIds,
  webAppUrl,
  webhookSecret,
  onWebAppUrlChange,
  onWebhookSecretChange,
  onSettingsSave,
}: GoogleCalendarSyncPanelProps) {
  const [urlDraft, setUrlDraft] = useState(webAppUrl);
  const [secretDraft, setSecretDraft] = useState(webhookSecret);
  const [loading, setLoading] = useState(false);
  const [syncingTaskId, setSyncingTaskId] = useState<string | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [autoSync, setAutoSync] = useState(() => {
    return localStorage.getItem(SHARED_CALENDAR_AUTO_SYNC_KEY) === 'true';
  });

  const sanitizeWebAppUrlDraft = (value: string) => {
    const nextValue = value.trim();
    if (nextValue.includes('@') && !nextValue.startsWith('http')) return '';
    return value;
  };

  useEffect(() => {
    const clearAutofill = window.setTimeout(() => {
      const currentValue = urlInputRef.current?.value || '';
      if (currentValue.includes('@') && !currentValue.startsWith('http')) {
        if (urlInputRef.current) {
          urlInputRef.current.value = '';
        }
        setUrlDraft('');
        onWebAppUrlChange('');
        onWebhookSecretChange('');
      }
    }, 250);

    return () => window.clearTimeout(clearAutofill);
  }, [onWebAppUrlChange, onWebhookSecretChange]);

  useEffect(() => {
    setUrlDraft(sanitizeWebAppUrlDraft(webAppUrl));
  }, [webAppUrl]);

  useEffect(() => {
    setSecretDraft(webhookSecret);
  }, [webhookSecret]);

  const hasWebAppUrl = isAppsScriptWebAppUrl(webAppUrl);
  const unsyncedCount = tasks.filter((task) => !syncedTaskIds.includes(task.id)).length;

  const handleClearSettings = () => {
    setUrlDraft('');
    setSecretDraft('');
    if (onSettingsSave) {
      onSettingsSave('', '');
    } else {
      onWebAppUrlChange('');
      onWebhookSecretChange('');
    }
    addToast('연동 입력값 초기화', '잘못 자동 입력된 이메일과 연동 키를 비웠습니다. Apps Script /exec URL을 다시 붙여넣어 주세요.', '🧹');
  };

  const handleSaveSettings = () => {
    const nextUrl = sanitizeWebAppUrlDraft(urlDraft).trim();
    const nextSecret = nextUrl ? secretDraft.trim() : '';

    if (urlDraft.trim() && !nextUrl) {
      setUrlDraft('');
      setSecretDraft('');
      if (onSettingsSave) {
        onSettingsSave('', '');
      } else {
        onWebAppUrlChange('');
        onWebhookSecretChange('');
      }
      addToast('URL 입력값 초기화', '이메일 주소는 웹앱 URL이 아닙니다. Apps Script 배포 화면의 /exec URL을 붙여넣어 주세요.', '⚠️');
      return;
    }

    if (nextUrl && !isAppsScriptWebAppUrl(nextUrl)) {
      addToast(
        'URL 형식 확인',
        'Apps Script 웹앱 URL은 script.google.com의 /exec 주소여야 합니다. 학교 계정 주소(/a/macros/dongyang.ac.kr/...)도 사용할 수 있습니다.',
        '⚠️'
      );
      return;
    }

    if (onSettingsSave) {
      onSettingsSave(nextUrl, nextSecret);
    } else {
      onWebAppUrlChange(nextUrl);
      onWebhookSecretChange(nextSecret);
    }
    if (!nextUrl) {
      setSecretDraft('');
    }
    addToast(
      'Google 할 일 연결 설정 저장',
      nextUrl
        ? `${FACILITY_SHARED_CALENDAR_NAME} 전송용 웹앱 URL이 저장되었습니다.`
        : '웹앱 URL 설정이 비워졌습니다.',
      '🔗'
    );
  };

  const handleOpenWebApp = () => {
    const targetUrl = (isAppsScriptWebAppUrl(webAppUrl) ? webAppUrl : urlDraft).trim();

    if (!targetUrl) {
      addToast('웹앱 URL 필요', 'Apps Script 웹앱 URL을 먼저 저장해 주세요.', '🔒');
      return;
    }

    if (!isAppsScriptWebAppUrl(targetUrl)) {
      addToast(
        'URL 형식 확인',
        'Apps Script 웹앱 URL은 script.google.com의 /exec 주소여야 합니다. 학교 계정 주소(/a/macros/dongyang.ac.kr/...)도 사용할 수 있습니다.',
        '⚠️'
      );
      return;
    }

    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    addToast('웹앱 확인', '새 창에서 ok: true와 tasksAccess: true가 보이면 rhs@dongyang.ac.kr Google 할 일 전송 준비가 된 상태입니다.', '↗');
  };

  const handleToggleAutoSync = () => {
    if (!hasWebAppUrl && !autoSync) {
      addToast('웹앱 URL 필요', '자동 연동을 켜기 전에 Apps Script 웹앱 URL을 먼저 저장해 주세요.', '🔒');
      return;
    }

    const nextValue = !autoSync;
    setAutoSync(nextValue);
    localStorage.setItem(SHARED_CALENDAR_AUTO_SYNC_KEY, String(nextValue));
    addToast(
      '자동 연동 설정 변경',
      nextValue
        ? `신규 업무지정이 등록되면 ${FACILITY_SHARED_CALENDAR_NAME}로 자동 전송됩니다.`
        : '신규 업무지정 자동 전송이 꺼졌습니다. 수동 연동은 계속 사용할 수 있습니다.',
      '📅'
    );
  };

  const handleSyncSingle = async (task: Task) => {
    if (!hasWebAppUrl) {
      addToast('웹앱 URL 필요', 'Apps Script 웹앱 URL을 먼저 저장해 주세요.', '🔒');
      return;
    }

    setSyncingTaskId(task.id);
    try {
      await syncTaskToGoogleCalendar(task, webAppUrl, webhookSecret);
      onTasksSynced([...new Set([...syncedTaskIds, task.id])]);
      addToast(
        'Google 할 일 전송 요청 완료',
        `'${task.title}' 지시를 ${FACILITY_SHARED_CALENDAR_NAME} 웹앱으로 보냈습니다. Google 캘린더의 할 일에서 확인해 주세요.`,
        '✅'
      );
    } catch (err) {
      addToast('전송 실패', getErrorMessage(err, 'Google 할 일 전송 중 오류가 발생했습니다.'), '❌');
    } finally {
      setSyncingTaskId(null);
    }
  };

  const handleBulkSync = async () => {
    if (!hasWebAppUrl) {
      addToast('웹앱 URL 필요', 'Apps Script 웹앱 URL을 먼저 저장해 주세요.', '🔒');
      return;
    }

    const unsynced = tasks.filter((task) => !syncedTaskIds.includes(task.id));
    if (unsynced.length === 0) {
      addToast('동기화 완료', '이미 모든 업무지정이 Google 할 일로 전송된 상태입니다.', '✓');
      return;
    }

    const confirmed = window.confirm(
      `${FACILITY_SHARED_CALENDAR_NAME}로 미전송 업무지정 ${unsynced.length}건을 일괄 전송하시겠습니까?`
    );
    if (!confirmed) return;

    setLoading(true);
    const successfullySyncedIds = [...syncedTaskIds];
    let successCount = 0;

    for (const task of unsynced) {
      try {
        setSyncingTaskId(task.id);
        await syncTaskToGoogleCalendar(task, webAppUrl, webhookSecret);
        successfullySyncedIds.push(task.id);
        successCount++;
      } catch (err) {
        console.error(`Error syncing task ${task.id}:`, err);
      }
    }

    onTasksSynced([...new Set(successfullySyncedIds)]);
    setSyncingTaskId(null);
    setLoading(false);

    addToast(
      successCount > 0 ? '일괄 전송 요청 완료' : '일괄 전송 실패',
      successCount > 0
        ? `총 ${successCount}건의 업무지정을 ${FACILITY_SHARED_CALENDAR_NAME} 웹앱으로 보냈습니다. Google 캘린더의 할 일에서 확인해 주세요.`
        : 'Google 할 일 웹앱으로 전송된 업무지정이 없습니다. 웹앱 URL과 배포 권한을 확인해 주세요.',
      successCount > 0 ? '✨' : '⚠️'
    );
  };

  return (
    <div className="space-y-3.5 w-full">
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-5 relative overflow-hidden"
        id="google-calendar-sync-panel"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5 z-10">
          <div className="flex items-start space-x-3.5">
            <div
              className={`p-4 rounded-2xl border flex items-center justify-center shrink-0 ${
                hasWebAppUrl
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                  : 'bg-slate-850 border-slate-750 text-slate-500'
              }`}
            >
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-white font-black text-sm tracking-tight flex items-center gap-2">
                시설관리팀 공유 일정 할 일 전송
                {hasWebAppUrl && (
                  <span className="bg-indigo-600/20 text-indigo-400 border border-indigo-530/20 text-[9px] px-2 py-0.5 rounded-lg font-black tracking-widest uppercase">
                    WEBHOOK READY
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-semibold leading-relaxed max-w-2xl">
                앱 사용자는 Google 로그인을 하지 않습니다. 업무지정은 저장된 Apps Script 웹앱으로 전송되고, rhs@dongyang.ac.kr로 배포된 웹앱이 Google 캘린더에 보이는 할 일로 등록합니다.
              </p>
              <p className="text-[10px] text-slate-600 mt-1 font-mono break-all">{FACILITY_SHARED_CALENDAR_ID}</p>

              <div className="flex flex-wrap items-center gap-3.5 mt-3 text-xs select-none">
                <button
                  type="button"
                  onClick={handleToggleAutoSync}
                  className={`flex items-center gap-1.5 font-bold transition-colors ${
                    hasWebAppUrl ? 'cursor-pointer text-indigo-400 hover:text-indigo-300' : 'cursor-not-allowed text-slate-600'
                  }`}
                >
                  {autoSync ? (
                    <ToggleRight className="w-5 h-5 text-indigo-400" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-slate-600" />
                  )}
                  <span>신규 지시 발행 시 자동 Google 할 일 전송</span>
                </button>
                <div className="h-4 w-[1px] bg-slate-800"></div>
                <span className="text-slate-500 font-bold">
                  미전송 업무: <span className="text-amber-400 font-black">{unsyncedCount}건</span>
                </span>
                {syncingTaskId && (
                  <span className="text-indigo-400 font-black">전송 중: {syncingTaskId}</span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleBulkSync}
            disabled={loading || !hasWebAppUrl || unsyncedCount === 0}
            className={`px-5 py-3 rounded-2xl text-xs font-black shadow-lg border transition-all flex items-center justify-center space-x-2 ${
              loading || !hasWebAppUrl || unsyncedCount === 0
                ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500/30 cursor-pointer shadow-indigo-500/20'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>미전송 지시 일괄 전송 ({unsyncedCount})</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3.5 z-10">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-3">
            <label className="space-y-1.5">
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-indigo-400" />
                Apps Script 웹앱 URL
              </span>
              <input
                ref={urlInputRef}
                type="search"
                name="facility-apps-script-webhook-url"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
                inputMode="url"
                value={urlDraft}
                onChange={(event) => setUrlDraft(sanitizeWebAppUrlDraft(event.target.value))}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400 outline-none text-white font-semibold"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                연동 키
              </span>
              <input
                type="search"
                name="facility-webhook-secret-optional"
                autoComplete="new-password"
                autoCorrect="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
                value={secretDraft}
                onChange={(event) => setSecretDraft(event.target.value)}
                placeholder="선택 입력"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400 outline-none text-white font-semibold"
              />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2">
            <button
              type="button"
              onClick={handleSaveSettings}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-750 text-white rounded-2xl text-xs font-black border border-slate-700 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              설정 저장
            </button>
            <button
              type="button"
              onClick={handleClearSettings}
              className="px-5 py-3 bg-slate-950 hover:bg-slate-900 text-slate-300 rounded-2xl text-xs font-black border border-slate-700 cursor-pointer"
            >
              입력값 초기화
            </button>
            <button
              type="button"
              onClick={handleOpenWebApp}
              className="px-5 py-3 rounded-2xl text-xs font-black border flex items-center justify-center gap-1.5 bg-slate-950 hover:bg-slate-900 text-slate-200 border-slate-700 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-indigo-400" />
              웹앱 확인
            </button>
          </div>
        </div>

        <div className="z-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5 text-sm">
          {[
            {
              step: '1',
              title: 'Apps Script 배포',
              text: 'rhs@dongyang.ac.kr 계정으로 Google Apps Script에 로그인한 뒤 시설관리 웹앱을 배포합니다. 실행 계정은 나로 설정하고 Google Tasks 권한을 승인합니다.',
            },
            {
              step: '2',
              title: '/exec URL 복사',
              text: '배포 완료 화면의 웹 앱 URL을 복사합니다. 일반 주소와 학교 계정 주소 모두 사용할 수 있지만 반드시 /exec로 끝나야 합니다.',
            },
            {
              step: '3',
              title: 'URL 저장',
              text: '복사한 주소를 Apps Script 웹앱 URL 칸에 붙여넣고 설정 저장을 누릅니다. 연동 키는 설정한 경우에만 입력합니다.',
            },
            {
              step: '4',
              title: '웹앱 확인',
              text: '웹앱 확인을 눌렀을 때 ok: true, tasksAccess: true가 보이면 업무지정을 Google 캘린더의 할 일로 보낼 수 있습니다.',
            },
          ].map((item) => (
            <div key={item.step} className="rounded-2xl border border-slate-700 bg-slate-950/70 p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
                  {item.step}
                </span>
                <h3 className="text-white text-sm font-black">{item.title}</h3>
              </div>
              <p className="text-slate-300 leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>

        <div
          className={`z-10 rounded-2xl p-4 text-xs font-bold leading-relaxed flex items-start gap-2 ${
            hasWebAppUrl
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-100'
              : 'bg-amber-500/10 border border-amber-500/20 text-amber-200'
          }`}
        >
          <AlertCircle
            className={`w-4 h-4 shrink-0 mt-0.5 ${hasWebAppUrl ? 'text-emerald-400' : 'text-amber-400'}`}
          />
          <div>
            <p>
              {hasWebAppUrl
                ? '웹앱 URL이 저장되었습니다. 웹앱 확인을 눌러 ok: true와 tasksAccess: true가 함께 보이면 전송 준비가 끝난 상태입니다.'
                : 'Apps Script 웹앱을 배포한 뒤 /exec URL을 붙여넣고 설정 저장을 누르세요.'}
            </p>
            <p className="mt-1 text-slate-400">
              배포 파일은 <span className="font-mono">apps-script/facility-calendar-webhook.gs</span>에 준비되어 있으며, 실제 할 일 등록 확인은 작업 상세 화면의 <span className="text-slate-200">할 일 전송</span>으로 진행합니다.
            </p>
            <p className="mt-1 text-slate-400">
              연동 키는 선택 사항입니다. Apps Script에서 WEBHOOK_SECRET을 별도로 설정한 경우에만 같은 값을 입력하고, 설정하지 않았다면 비워 두면 됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
