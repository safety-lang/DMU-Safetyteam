import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Task, UserProfile, TeamNotification, TaskStatus, TaskPriority, TaskComment, DailyLog, FacilityAppState } from './types';
import { DEFAULT_USERS, DEFAULT_TASKS, DEFAULT_NOTIFICATIONS, DEFAULT_DAILY_LOGS } from './initialData';
import DashboardStats from './components/DashboardStats';
import TaskCard from './components/TaskCard';
import NewTaskModal from './components/NewTaskModal';
import TaskDetailModal from './components/TaskDetailModal';
import DailyWorkLogs from './components/DailyWorkLogs';
import GocheokWeather from './components/GocheokWeather';
import DMUMascot from './components/DMUMascot';
import GoogleCalendarSyncPanel from './components/GoogleCalendarSyncPanel';
import SharedDataServerPanel from './components/SharedDataServerPanel';
import FacilityAdminPage from './components/facility/FacilityAdminPage';
import SystemManualModal from './components/SystemManualModal';
import AdminDataCenter from './components/AdminDataCenter';
import SupabaseLoginGate from './components/SupabaseLoginGate';
import {
  FACILITY_SHARED_CALENDAR_NAME,
  SHARED_CALENDAR_AUTO_SYNC_KEY,
  SHARED_CALENDAR_WEB_APP_URL_KEY,
  SHARED_CALENDAR_WEBHOOK_SECRET_KEY,
  syncTaskToGoogleCalendar,
} from './lib/googleCalendar';
import { getErrorMessage } from './lib/errors';
import { getTaskStatusLabel, isApprovalPending } from './lib/taskState';
import { formatTaskAssigneeLabel, taskIncludesAssignee } from './lib/taskAssignees';
import { normalizeWorkCategory } from './lib/workCategories';
import { clearStoredSupabaseAuthSession } from './lib/supabaseAuth';
import { isPrimaryAdminUser } from './lib/teamMembers';
import { getSupabaseStateConfig, loadSupabaseState, saveSupabaseState } from './lib/supabaseState';
import {
  isFacilityModuleSnapshot,
  readFacilityModuleSnapshot,
  writeFacilityModuleSnapshot,
} from './facility/facilitySnapshot';
import { useFacilityUserAccess } from './facility/useFacilityUserAccess';
import { 
  Wrench, 
  Search, 
  Plus, 
  Bell, 
  BellRing,
  BookOpen,
  Download,
  ExternalLink,
  Grid, 
  List, 
  Upload,
  X, 
  ClipboardList,
  LogOut,
  Volume2,
  VolumeX
} from 'lucide-react';

interface Toast {
  id: string;
  title: string;
  message: string;
  avatar?: string;
}

type NotificationTone = 'normal' | 'urgent' | 'success';
type ManagerActionPayload = TaskPriority | string;

type SharedPersistOptions = {
  successTitle?: string;
  successMessage?: string;
  errorTitle?: string;
  errorMessage?: string;
};

type AudioContextWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

const SHARED_CALENDAR_SYNC_STORAGE_KEY = 'fms_google_synced_tasks_facility_shared';
const SUPPLY_PURCHASE_REQUEST_URL = 'https://facility-supply-app.vercel.app/request';

const readStoredTasks = () => {
  const saved = localStorage.getItem('fms_tasks');
  if (!saved) return DEFAULT_TASKS;

  try {
    const parsed = JSON.parse(saved) as unknown;
    return Array.isArray(parsed)
      ? (parsed as Task[]).map((task) => ({ ...task, category: normalizeWorkCategory(task.category || '') }))
      : DEFAULT_TASKS;
  } catch {
    return DEFAULT_TASKS;
  }
};

const isFacilityAppState = (value: unknown): value is FacilityAppState => {
  const candidate = value as FacilityAppState;
  return Boolean(
    candidate &&
      candidate.app === 'DMU_FACILITY_MANAGEMENT' &&
      candidate.version === 1 &&
      Array.isArray(candidate.tasks) &&
      Array.isArray(candidate.notifications) &&
      Array.isArray(candidate.dailyLogs)
  );
};

export default function App() {
  useEffect(() => {
    if (window.location.hostname === '127.0.0.1') {
      const nextUrl = new URL(window.location.href);
      nextUrl.hostname = 'localhost';
      window.location.replace(nextUrl.toString());
    }
  }, []);

  // 1. Core States
  const [tasks, setTasks] = useState<Task[]>(readStoredTasks);

  const [notifications, setNotifications] = useState<TeamNotification[]>(() => {
    const saved = localStorage.getItem('fms_notifications');
    return saved ? JSON.parse(saved) : DEFAULT_NOTIFICATIONS;
  });

  const [users] = useState<UserProfile[]>(DEFAULT_USERS);
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEFAULT_USERS[0]);
  const supabaseStateConfig = useMemo(() => getSupabaseStateConfig(), []);
  const requiresSupabaseLogin = supabaseStateConfig.enabled;
  const [isAuthReady, setIsAuthReady] = useState(!requiresSupabaseLogin);
  const [authenticatedEmail, setAuthenticatedEmail] = useState<string | null>(null);
  const facilityAccess = useFacilityUserAccess(users);
  const currentFacilityRole = facilityAccess.getRoleForUser(currentUser);
  const canManageAdminAccess =
    isPrimaryAdminUser(currentUser, requiresSupabaseLogin ? authenticatedEmail : null) &&
    currentFacilityRole === 'admin';
  
  // Tab control state
  const [activeTab, setActiveTab] = useState<'tasks' | 'dailyLogs' | 'facilities' | 'adminData'>('facilities');

  // Daily work logs state
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>(() => {
    const saved = localStorage.getItem('fms_daily_logs');
    return saved ? JSON.parse(saved) : DEFAULT_DAILY_LOGS;
  });

  // 2. Filter states
  const [selectedStatus, setSelectedStatus] = useState<string>('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showMyTasksOnly, setShowMyTasksOnly] = useState(false);

  // 3. Modals and panels
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [focusTaskActionPanel, setFocusTaskActionPanel] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('fms_sound_enabled') === 'true';
  });

  // Shared Google Calendar integration states
  const [calendarWebAppUrl, setCalendarWebAppUrl] = useState(() => {
    return localStorage.getItem(SHARED_CALENDAR_WEB_APP_URL_KEY) || '';
  });
  const [calendarWebhookSecret, setCalendarWebhookSecret] = useState(() => {
    return localStorage.getItem(SHARED_CALENDAR_WEBHOOK_SECRET_KEY) || '';
  });
  const [syncedTaskIds, setSyncedTaskIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(SHARED_CALENDAR_SYNC_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const backupFileInputRef = useRef<HTMLInputElement>(null);
  const taskListRef = useRef<HTMLElement>(null);
  const hadStoredAppDataRef = useRef(
    Boolean(
      localStorage.getItem('fms_tasks') ||
      localStorage.getItem('fms_notifications') ||
      localStorage.getItem('fms_daily_logs')
    )
  );

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('fms_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(SHARED_CALENDAR_SYNC_STORAGE_KEY, JSON.stringify(syncedTaskIds));
  }, [syncedTaskIds]);

  useEffect(() => {
    localStorage.setItem(SHARED_CALENDAR_WEB_APP_URL_KEY, calendarWebAppUrl);
  }, [calendarWebAppUrl]);

  useEffect(() => {
    localStorage.setItem(SHARED_CALENDAR_WEBHOOK_SECRET_KEY, calendarWebhookSecret);
  }, [calendarWebhookSecret]);

  useEffect(() => {
    localStorage.setItem('fms_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('fms_daily_logs', JSON.stringify(dailyLogs));
  }, [dailyLogs]);

  // Keep selectedTask updated if tasks list changes (like comments or status updates)
  useEffect(() => {
    if (selectedTask) {
      const updated = tasks.find((t) => t.id === selectedTask.id);
      if (updated) {
        setSelectedTask(updated);
      }
    }
  }, [tasks, selectedTask]);

  const playNotificationSound = useCallback((tone: NotificationTone = 'normal', force = false) => {
    if (!force && !soundEnabled) return;

    const AudioContextClass =
      window.AudioContext || (window as AudioContextWindow).webkitAudioContext;

    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const masterGain = ctx.createGain();
    const frequencies: Record<NotificationTone, number[]> = {
      normal: [660, 880],
      urgent: [880, 660, 980],
      success: [523, 659, 784],
    };

    masterGain.gain.setValueAtTime(tone === 'urgent' ? 0.09 : 0.065, ctx.currentTime);
    masterGain.connect(ctx.destination);

    frequencies[tone].forEach((frequency, index) => {
      const startAt = ctx.currentTime + index * 0.13;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = tone === 'urgent' ? 'square' : 'sine';
      oscillator.frequency.setValueAtTime(frequency, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(tone === 'urgent' ? 0.08 : 0.052, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.11);

      oscillator.connect(gain);
      gain.connect(masterGain);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.12);
    });

    window.setTimeout(() => {
      void ctx.close().catch(() => undefined);
    }, frequencies[tone].length * 130 + 300);
  }, [soundEnabled]);

  // Toast notification timing
  const addToast = (title: string, message: string, avatar?: string, sound?: NotificationTone) => {
    if (sound) {
      playNotificationSound(sound);
    }

    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    setToasts((prev) => [...prev, { id, title, message, avatar }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('fms_sound_enabled', String(next));

    if (next) {
      playNotificationSound('normal', true);
      addToast('알림음 켜짐', '업무지정과 현장 보고가 들어오면 이 브라우저에서 소리가 납니다.', '🔔');
      return;
    }

    addToast('알림음 꺼짐', '소리 없이 화면 알림만 표시합니다.', '🔕');
  };

  const handleTestSound = () => {
    playNotificationSound('normal', true);
    addToast('알림음 테스트', '이 소리가 들리면 브라우저 알림음이 정상입니다.', '🔔');
  };

  const handleAuthenticatedUser = useCallback((user: UserProfile, email: string) => {
    setCurrentUser(user);
    setAuthenticatedEmail(email);
    setIsAuthReady(true);
    setSelectedStatus('전체');
    setSearchQuery('');
    setViewMode('grid');
    setShowMyTasksOnly(user.role !== '팀장');
    if (user.role !== '팀장') {
      setActiveTab('tasks');
    }
  }, []);

  const handleSignOut = () => {
    clearStoredSupabaseAuthSession();
    setAuthenticatedEmail(null);
    setCurrentUser(DEFAULT_USERS[0]);
    setIsAuthReady(!requiresSupabaseLogin);
    setShowNotifications(false);
    addToast('로그아웃 완료', '다시 사용하려면 직원 이메일과 비밀번호로 로그인해 주세요.', '🔒');
  };

  const openSupplyRequest = () => {
    window.location.assign(SUPPLY_PURCHASE_REQUEST_URL);
  };

  const openTaskDetail = (task: Task, focusActionPanel = false) => {
    setFocusTaskActionPanel(focusActionPanel);
    setSelectedTask(task);
  };

  const closeTaskDetail = () => {
    setFocusTaskActionPanel(false);
    setSelectedTask(null);
  };

  const createAppSnapshot = useCallback((overrides: Partial<FacilityAppState> = {}): FacilityAppState => ({
    app: 'DMU_FACILITY_MANAGEMENT',
    version: 1,
    exportedAt: new Date().toISOString(),
    tasks: overrides.tasks ?? tasks,
    notifications: overrides.notifications ?? notifications,
    dailyLogs: overrides.dailyLogs ?? dailyLogs,
    syncedTaskIds: overrides.syncedTaskIds ?? syncedTaskIds,
    calendarWebAppUrl: overrides.calendarWebAppUrl ?? calendarWebAppUrl,
    calendarWebhookSecret: overrides.calendarWebhookSecret ?? calendarWebhookSecret,
    soundEnabled: overrides.soundEnabled ?? soundEnabled,
    facilityUserAccess: overrides.facilityUserAccess ?? facilityAccess.accessList,
    facilityModule: overrides.facilityModule ?? readFacilityModuleSnapshot(),
  }), [
    tasks,
    notifications,
    dailyLogs,
    syncedTaskIds,
    calendarWebAppUrl,
    calendarWebhookSecret,
    soundEnabled,
    facilityAccess.accessList,
  ]);

  const persistSharedState = (
    overrides: Partial<FacilityAppState>,
    options: SharedPersistOptions = {},
  ) => {
    const snapshotToSave = createAppSnapshot(overrides);
    const updatedBy = authenticatedEmail || currentUser.email || currentUser.name;
    const errorTitle = options.errorTitle || '공용 저장 실패';
    const errorMessage = options.errorMessage || '변경 내용은 현재 화면에 저장됐지만 공용 저장소 반영은 실패했습니다.';

    if (supabaseStateConfig.enabled) {
      void saveSupabaseState(snapshotToSave, updatedBy)
        .then(() => {
          if (options.successTitle) {
            addToast(options.successTitle, options.successMessage || '공용 저장소에 반영했습니다.', '✅', 'success');
          }
        })
        .catch((error) => {
          addToast(errorTitle, `${errorMessage} ${getErrorMessage(error, '연결 상태를 확인해 주세요.')}`, '⚠️');
        });
      return;
    }

    void fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshotToSave),
    })
      .then((response) => {
        if (!response.ok) throw new Error('서버 저장에 실패했습니다.');
        if (options.successTitle) {
          addToast(options.successTitle, options.successMessage || '공용 저장소에 반영했습니다.', '✅', 'success');
        }
      })
      .catch((error) => {
        addToast(errorTitle, `${errorMessage} ${getErrorMessage(error, '팀원 공용 저장소 연결 상태를 확인해 주세요.')}`, '⚠️');
      });
  };

  const applyAppSnapshot = useCallback((snapshot: FacilityAppState, resetView = true) => {
    if (!isFacilityAppState(snapshot)) {
      throw new Error('시설관리 시스템 데이터 형식이 아닙니다.');
    }

    setTasks(snapshot.tasks.map((task) => ({ ...task, category: normalizeWorkCategory(task.category || '') })));
    setNotifications(snapshot.notifications);
    setDailyLogs(snapshot.dailyLogs);
    setSyncedTaskIds(Array.isArray(snapshot.syncedTaskIds) ? snapshot.syncedTaskIds : []);
    setCalendarWebAppUrl(snapshot.calendarWebAppUrl || '');
    setCalendarWebhookSecret(snapshot.calendarWebhookSecret || '');
    if (snapshot.facilityUserAccess) {
      facilityAccess.replaceAccessList(snapshot.facilityUserAccess);
    }
    if (isFacilityModuleSnapshot(snapshot.facilityModule)) {
      writeFacilityModuleSnapshot(snapshot.facilityModule);
      facilityAccess.replaceAccessList(snapshot.facilityModule.userAccess);
    }
    setSoundEnabled(Boolean(snapshot.soundEnabled));
    localStorage.setItem('fms_sound_enabled', String(Boolean(snapshot.soundEnabled)));
    if (resetView) {
      setSelectedStatus('전체');
      setSearchQuery('');
      setShowMyTasksOnly(currentUser.role !== '팀장');
      if (currentUser.role !== '팀장') {
        setActiveTab('tasks');
      }
    }
  }, [currentUser.role, facilityAccess]);

  useEffect(() => {
    if (requiresSupabaseLogin && !isAuthReady) return;
    if (!requiresSupabaseLogin && hadStoredAppDataRef.current) return;
    hadStoredAppDataRef.current = true;

    let cancelled = false;

    const loadInitialSharedState = async () => {
      try {
        if (supabaseStateConfig.enabled) {
          const result = await loadSupabaseState();
          if (!cancelled && result.hasState && isFacilityAppState(result.state)) {
            applyAppSnapshot(result.state);
          }
          return;
        }

        const response = await fetch('/api/state', { cache: 'no-store' });
        if (!response.ok) return;
        const result = await response.json();
        if (!cancelled && result.hasState && isFacilityAppState(result.state)) {
          applyAppSnapshot(result.state);
        }
      } catch {
        // Static preview mode has no shared server API. Keep the built-in starter data.
      }
    };

    void loadInitialSharedState();

    return () => {
      cancelled = true;
    };
  }, [applyAppSnapshot, isAuthReady, requiresSupabaseLogin, supabaseStateConfig.enabled]);

  useEffect(() => {
    if (requiresSupabaseLogin && !isAuthReady) return;

    let cancelled = false;
    const refreshSharedState = async () => {
      try {
        if (supabaseStateConfig.enabled) {
          const result = await loadSupabaseState();
          if (!cancelled && result.hasState && isFacilityAppState(result.state)) {
            applyAppSnapshot(result.state, false);
          }
          return;
        }

        const response = await fetch('/api/state', { cache: 'no-store' });
        if (!response.ok) return;
        const result = await response.json();
        if (!cancelled && result.hasState && isFacilityAppState(result.state)) {
          applyAppSnapshot(result.state, false);
        }
      } catch {
        // Keep the current screen if the shared store is temporarily unavailable.
      }
    };

    const intervalId = window.setInterval(refreshSharedState, 20000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [applyAppSnapshot, isAuthReady, requiresSupabaseLogin, supabaseStateConfig.enabled]);

  const handleTeamAdminAccessChange = (userId: string, isAdmin: boolean) => {
    if (!canManageAdminAccess) {
      addToast('권한 변경 불가', '관리자 지정 권한은 나형석 팀장에게만 있습니다.', '⚠️');
      return;
    }

    if (userId === currentUser.id) {
      addToast('권한 변경 제한', '현재 로그인한 본인 계정의 관리자 권한은 해제할 수 없습니다.', 'ℹ️');
      return;
    }

    const target = users.find((user) => user.id === userId);
    facilityAccess.changeRole(userId, isAdmin ? 'admin' : 'staff');
    facilityAccess.changeActive(userId, true);
    addToast(
      '관리자 권한 변경',
      `${target?.name || '선택한 사용자'} 계정을 ${isAdmin ? '관리자' : '일반 팀원'} 권한으로 변경했습니다.`,
      '🛡️'
    );
  };

  const handleExportTasksCsv = () => {
    const headers = ['ID', '업무구분', '제목', '상태', '우선순위', '위치', '담당자', '등록일', '완료일', '완료보고'];
    const rows = filteredTasks.map((task) => [
      task.id,
      task.category,
      task.title,
      getTaskStatusLabel(task),
      task.priority,
      task.location,
      task.assignee,
      new Date(task.createdAt).toLocaleString('ko-KR'),
      task.completedAt ? new Date(task.completedAt).toLocaleString('ko-KR') : '',
      task.completionReport || '',
    ]);
    const escapeCell = (value: string) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `시설관리_업무지정_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    addToast('보고서 내보내기', `현재 필터 기준 업무지정 ${filteredTasks.length}건을 CSV 파일로 저장했습니다.`, '📄');
  };

  const handleExportAppBackup = () => {
    const backup = createAppSnapshot();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `시설관리_전체백업_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    addToast('전체 데이터 백업 완료', '업무지정, 셀프 근무일지, 시설, 대관 일정, 점검, 자산 데이터를 백업 파일로 저장했습니다.', '💾');
  };

  const handleImportAppBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const confirmed = window.confirm(
      '백업 파일을 복원하면 현재 브라우저에 저장된 업무지정, 셀프 근무일지, 시설, 대관 일정, 점검, 자산 데이터가 백업 내용으로 바뀝니다. 계속하시겠습니까?'
    );
    if (!confirmed) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));

        if (!isFacilityAppState(parsed)) {
          throw new Error('시설관리 시스템 백업 파일 형식이 아닙니다.');
        }

        applyAppSnapshot(parsed);
        addToast('백업 복원 완료', `백업 파일 ${file.name}의 운영 데이터를 불러왔습니다.`, '✅', 'success');
      } catch (error) {
        addToast('백업 복원 실패', getErrorMessage(error, '파일을 읽는 중 문제가 발생했습니다.'), '⚠️');
      }
    };
    reader.onerror = () => {
      addToast('백업 복원 실패', '백업 파일을 읽지 못했습니다. 파일을 다시 선택해 주세요.', '⚠️');
    };
    reader.readAsText(file, 'utf-8');
  };

  // 4. Filters & Searches Matcher
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchStatus =
        selectedStatus === '전체' || getTaskStatusLabel(t) === selectedStatus;
      const matchOwner = !showMyTasksOnly || currentUser.role === '팀장' || taskIncludesAssignee(t.assignee, currentUser.name);
      
      const text = `${t.category} ${t.title} ${t.description} ${t.location} ${t.assignee}`.toLowerCase();
      const matchSearch = text.includes(searchQuery.toLowerCase());

      return matchStatus && matchSearch && matchOwner;
    }).sort((a, b) => {
      // Urgent ones first, then most recently created
      if (a.priority === '긴급' && b.priority !== '긴급') return -1;
      if (a.priority !== '긴급' && b.priority === '긴급') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [tasks, selectedStatus, searchQuery, showMyTasksOnly, currentUser]);

  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);

  const visibleNotifications = useMemo(() => {
    if (currentUser.role === '팀장') return notifications;

    return notifications.filter((notification) => {
      if (notification.senderName === currentUser.name) return true;
      const relatedTask = taskById.get(notification.taskId);
      return Boolean(relatedTask && taskIncludesAssignee(relatedTask.assignee, currentUser.name));
    });
  }, [currentUser, notifications, taskById]);

  const assignedTasks = useMemo(() => {
    if (currentUser.role === '팀장') return [];

    return tasks
      .filter((task) => taskIncludesAssignee(task.assignee, currentUser.name))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [currentUser, tasks]);

  const activeAssignedTasks = useMemo(
    () => assignedTasks.filter((task) => task.status !== '완료' || isApprovalPending(task)),
    [assignedTasks],
  );

  const newAssignedTasks = useMemo(
    () => assignedTasks.filter((task) => task.status === '대기중'),
    [assignedTasks],
  );

  const unreadAssignedNotifications = useMemo(
    () => visibleNotifications.filter((notification) => !notification.read).length,
    [visibleNotifications],
  );

  // Unread notifications count
  const unreadNotifCount = useMemo(() => {
    return visibleNotifications.filter((n) => !n.read).length;
  }, [visibleNotifications]);

  const markNotificationsReadByIds = (notificationIds: Set<string>) => {
    if (notificationIds.size === 0) return;

    let changed = false;
    const nextNotifications = notifications.map((notification) => {
      if (!notificationIds.has(notification.id) || notification.read) return notification;
      changed = true;
      return { ...notification, read: true };
    });

    if (!changed) return;
    setNotifications(nextNotifications);
    persistSharedState({ notifications: nextNotifications });
  };

  const scrollToTaskList = useCallback(() => {
    window.setTimeout(() => {
      taskListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }, []);

  const showAssignedTaskList = useCallback(() => {
    setActiveTab('tasks');
    closeTaskDetail();
    setSelectedStatus('전체');
    setSearchQuery('');
    setShowMyTasksOnly(true);
    setViewMode('grid');
    scrollToTaskList();
  }, [scrollToTaskList]);

  // 5. Actions handlers

  // Profile Swapper Action
  const handleUserChange = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (target) {
      setCurrentUser(target);
      addToast(
        '작업 계정 전환',
        `[${target.role}] ${target.name} 계정으로 로그인했습니다. 영역 제어 권한이 부여되었습니다.`,
        target.avatar
      );
    }
  };

  // Create Task Action
  const handleSaveNewTask = (data: {
    title: string;
    category: string;
    description: string;
    location: string;
    priority: TaskPriority;
    assignee: string;
    photoUrl?: string;
    dueDate?: string;
  }) => {
    const timestamp = new Date().toISOString();
    const newTask: Task = {
      id: `task_${Date.now()}`,
      title: data.title,
      category: data.category,
      description: data.description,
      status: '대기중',
      priority: data.priority,
      location: data.location,
      assignee: data.assignee,
      createdAt: timestamp,
      dueDate: data.dueDate,
      photoUrl: data.photoUrl,
      comments: [],
      history: [
        {
          id: `h_${Date.now()}`,
          timestamp,
          user: `${currentUser.name} (${currentUser.role})`,
          action: `[${data.category}] 신규 업무지정을 등록하고 담당자 [${data.assignee}]에게 배정했습니다.`
        }
      ]
    };

    // Add Notification
    const newNotification: TeamNotification = {
      id: `notif_${Date.now()}`,
      taskId: newTask.id,
      taskTitle: newTask.title,
      type: '등록',
      senderName: currentUser.name,
      senderRole: currentUser.role,
      message: `[배정 알림/${data.category}] ${data.assignee} 담당자에게 '${data.title}' 업무가 배정되었습니다. 업무지정 화면에서 업무 접수 후 완료 내용을 입력해 주세요.`,
      timestamp,
      read: false,
    };
    const nextTasks = [newTask, ...tasks];
    const nextNotifications = [newNotification, ...notifications];

    setTasks(nextTasks);
    setNotifications(nextNotifications);
    setActiveTab('tasks');
    setSelectedStatus('전체');
    setSearchQuery('');
    setShowMyTasksOnly(false);
    setViewMode('grid');

    addToast(
      '업무지정 등록 완료',
      `[${data.category}] '${data.title}' 업무가 현장 배정인원 ${data.assignee}에게 전송되었습니다.`,
      '📋',
      data.priority === '긴급' ? 'urgent' : 'normal'
    );

    persistSharedState(
      { tasks: nextTasks, notifications: nextNotifications },
      {
        successTitle: '온라인 저장 완료',
        successMessage: '방금 등록한 업무지정을 공용 저장소에도 저장했습니다.',
        errorTitle: '온라인 저장 실패',
        errorMessage: '업무지정은 현재 화면에는 저장됐지만 공용 저장소 저장은 실패했습니다.',
      },
    );

    // Auto sync to the facility shared calendar if enabled
    const autoSync = localStorage.getItem(SHARED_CALENDAR_AUTO_SYNC_KEY) === 'true';
    if (autoSync && calendarWebAppUrl) {
      syncTaskToGoogleCalendar(newTask, calendarWebAppUrl, calendarWebhookSecret)
        .then(() => {
          setSyncedTaskIds((prev) => [...prev, newTask.id]);
          addToast(
            '공유캘린더 전송 요청 완료',
            `'${newTask.title}' 지시를 ${FACILITY_SHARED_CALENDAR_NAME} 웹앱으로 보냈습니다. 캘린더에서 일정 생성을 확인해 주세요.`,
            '📅'
          );
        })
        .catch((err) => {
          console.error('Auto sync error:', err);
          addToast(
            '공유캘린더 동기화 실패',
            err?.message || '공유캘린더 추가 중 통신 오류가 있어 수동 연동을 이용하십시오.',
            '⚠️'
          );
        });
    }
  };

  // Update Status Action (접수대기 -> 작업중)
  const handleUpdateStatus = (taskId: string, newStatus: TaskStatus) => {
    const timestamp = new Date().toISOString();
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    const nextTasks = tasks.map((t) => {
      if (t.id !== taskId) return t;

      const updatedHistory = [
        ...t.history,
        {
          id: `h_${Date.now()}`,
          timestamp,
          user: `${currentUser.name} (${currentUser.role})`,
          action: `업무를 접수하고 작업중으로 전환했습니다.`
        }
      ];
      return { ...t, status: newStatus, history: updatedHistory };
    });

    const newNotification: TeamNotification = {
      id: `notif_${Date.now()}`,
      taskId,
      taskTitle: targetTask.title,
      type: '진행',
      senderName: currentUser.name,
      senderRole: currentUser.role,
      message: `[업무 확인] ${currentUser.name}님이 '${targetTask.title}' 업무를 확인하고 작업을 시작했습니다.`,
      timestamp,
      read: false,
    };
    const nextNotifications = [newNotification, ...notifications];

    setTasks(nextTasks);
    setNotifications(nextNotifications);
    persistSharedState({ tasks: nextTasks, notifications: nextNotifications });
    addToast(
      '업무 접수 완료',
      `'${targetTask.title}' 업무를 접수하고 [작업중]으로 전환했습니다.`,
      currentUser.avatar,
      'normal'
    );
  };

  const handleAssigneeTaskAction = (task: Task) => {
    setActiveTab('tasks');
    setSelectedStatus('전체');
    setSearchQuery('');
    setShowMyTasksOnly(true);
    setViewMode('grid');

    if (task.status === '대기중') {
      handleUpdateStatus(task.id, '진행중');
      openTaskDetail({ ...task, status: '진행중' }, true);
      return;
    }

    openTaskDetail(task, true);
  };

  // Submit Completion Report (기사 -> 완료보고 사진+글)
  const handleSubmitCompletion = (taskId: string, report: string, photoUrl?: string, remarks?: string) => {
    const timestamp = new Date().toISOString();
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    const nextTasks = tasks.map((t) => {
      if (t.id !== taskId) return t;

      const updatedHistory = [
        ...t.history,
        {
          id: `h_${Date.now()}`,
          timestamp,
          user: `${currentUser.name} (${currentUser.role})`,
          action: `담당자가 조치 내용을 입력하고 완료 보고서를 전송했습니다.`
        }
      ];
      return {
        ...t,
        completionReport: report,
        completionRemarks: remarks,
        completionPhotoUrl: photoUrl || t.completionPhotoUrl,
        status: '완료',
        completedAt: timestamp,
        history: updatedHistory
      };
    });

    const newNotification: TeamNotification = {
      id: `notif_${Date.now()}`,
      taskId,
      taskTitle: targetTask.title,
      type: '완료보고',
      senderName: currentUser.name,
      senderRole: currentUser.role,
      message: `[완료 내용 입력] ${currentUser.name}님이 '${targetTask.title}' 업무 완료 내용을 저장했습니다. 팀장 확인이 필요합니다.`,
      timestamp,
      read: false,
    };
    const nextNotifications = [newNotification, ...notifications];

    setTasks(nextTasks);
    setNotifications(nextNotifications);
    persistSharedState({ tasks: nextTasks, notifications: nextNotifications });
    
    addToast(
      '완료 내용 저장 완료',
      `'${targetTask.title}' 업무 완료 내용이 저장되었습니다. 나형석 팀장의 최종 승인을 기다립니다.`,
      currentUser.avatar,
      'success'
    );
  };

  const handleAttachTaskPhoto = (taskId: string, target: 'reference' | 'completion', photoUrl: string) => {
    const timestamp = new Date().toISOString();
    const label = target === 'reference' ? '현장 접수 사진' : '조치 완료 사진';
    const updateTask = (task: Task): Task => ({
      ...task,
      photoUrl: target === 'reference' ? photoUrl : task.photoUrl,
      completionPhotoUrl: target === 'completion' ? photoUrl : task.completionPhotoUrl,
      history: [
        ...task.history,
        {
          id: `h_${Date.now()}`,
          timestamp,
          user: `${currentUser.name} (${currentUser.role})`,
          action: `${label}을 첨부/변경했습니다.`,
        },
      ],
    });

    const nextTasks = tasks.map((task) => (task.id === taskId ? updateTask(task) : task));
    const nextSelectedTask = nextTasks.find((task) => task.id === taskId);
    setTasks(nextTasks);
    setSelectedTask((current) => (current?.id === taskId ? nextSelectedTask || current : current));
    persistSharedState({ tasks: nextTasks });
    addToast('사진 첨부 완료', `${label}이 업무지정에 저장되었습니다.`, '📷', 'success');
  };

  // Submit Comments / Chats Action
  const handleAddComment = (taskId: string, content: string) => {
    const timestamp = new Date().toISOString();
    const newComment: TaskComment = {
      id: `comment_${Date.now()}`,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      content,
      timestamp,
    };

    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    const nextTasks = tasks.map((t) => {
      if (t.id !== taskId) return t;

      const updatedHistory = [
        ...t.history,
        {
          id: `h_${Date.now()}`,
          timestamp,
          user: `${currentUser.name} (${currentUser.role})`,
          action: `현장 의견 교환: "${content.substring(0, 15)}..." 코멘트를 수록했습니다.`
        }
      ];
      return {
        ...t,
        comments: [...t.comments, newComment],
        history: updatedHistory
      };
    });

    const newNotification: TeamNotification = {
      id: `notif_${Date.now()}`,
      taskId,
      taskTitle: targetTask.title,
      type: '댓글',
      senderName: currentUser.name,
      senderRole: currentUser.role,
      message: `[의견교환] '${targetTask.title}' 업무에 ${currentUser.name}님이 코멘트를 남겼습니다.`,
      timestamp,
      read: false,
    };
    const nextNotifications = [newNotification, ...notifications];

    setTasks(nextTasks);
    setNotifications(nextNotifications);
    persistSharedState({ tasks: nextTasks, notifications: nextNotifications });
    addToast(
      '새 의견 등록',
      `'${targetTask.title}' 업무에 현장 의견이 추가되었습니다.`,
      currentUser.avatar,
      'normal'
    );
  };

  // Manager admin actions
  const handleManagerAction = (
    taskId: string,
    actionType: 'approve' | 'reject' | 'delete' | 'change_priority' | 'change_assignee',
    payload?: ManagerActionPayload
  ) => {
    const timestamp = new Date().toISOString();
    const targetTask = tasks.find((task) => task.id === taskId);
    if (!targetTask) return;
    
    if (actionType === 'delete') {
      const nextTasks = tasks.filter((t) => t.id !== taskId);
      setTasks(nextTasks);
      closeTaskDetail();
      persistSharedState({ tasks: nextTasks });
      addToast('업무지정 삭제', '해당 업무지정이 데이터베이스에서 삭제/파기되었습니다.', '🗑️');
      return;
    }

    let notificationMessage = '';
    let toastTitle = '';
    let toastMessage = '';
    let toastTone: NotificationTone = 'normal';
    let toastIcon = currentUser.avatar;

    const nextTasks = tasks.map((t) => {
      if (t.id !== taskId) return t;

      let updatedHistory = [...t.history];
      let updatedStatus = t.status;
      let updatedPriority = t.priority;
      let updatedAssignee = t.assignee;
      let updatedReport = t.completionReport;
      let updatedCompletedAt = t.completedAt;
      let updatedComments = t.comments;

      if (actionType === 'approve') {
        updatedHistory = [
          ...updatedHistory,
          {
            id: `h_${Date.now()}`,
            timestamp,
            user: `${currentUser.name} (${currentUser.role})`,
            action: '조치 완료 보고 심사를 최종 통과 및 [종결 완료] 처리했습니다.'
          }
        ];
        updatedStatus = '완료';
        notificationMessage = `[완료 승인] '${t.title}' 업무 조치가 최종 승인되었습니다.`;
        toastTitle = '완료 보고 최종 승인';
        toastMessage = `'${t.title}' 업무가 최종 종결 처리되었습니다.`;
        toastTone = 'success';
        toastIcon = '✅';
      } else if (actionType === 'reject') {
        updatedHistory = [
          ...updatedHistory,
          {
            id: `h_${Date.now()}`,
            timestamp,
            user: `${currentUser.name} (${currentUser.role})`,
            action: '보고 반려 및 현장 추가 보완 지시 송출 ([진행중] 원복)'
          }
        ];
        updatedStatus = '진행중';
        const autoComment: TaskComment = {
          id: `comment_${Date.now()}`,
          senderName: currentUser.name,
          senderRole: currentUser.role,
          content: '⚡ [보완요청 및 반려] 업로드해주신 보고자료를 검토한 결과 추가 점검 또는 보완이 필요합니다. 보완 후 조치 내용을 다시 입력해 주세요.',
          timestamp
        };
        updatedComments = [...t.comments, autoComment];
        updatedReport = undefined;
        updatedCompletedAt = undefined;
        notificationMessage = `[보완 요청] '${t.title}' 업무가 보완 요청으로 돌아왔습니다. 담당자는 조치 내용을 다시 입력해 주세요.`;
        toastTitle = '조치 반려 및 추가 보완 지시';
        toastMessage = `'${t.title}' 담당자에게 추가 피드백이 전달되었습니다.`;
        toastTone = 'urgent';
        toastIcon = '⚠️';
      } else if (actionType === 'change_priority') {
        updatedHistory = [
          ...updatedHistory,
          {
            id: `h_${Date.now()}`,
            timestamp,
            user: `${currentUser.name} (${currentUser.role})`,
            action: `해당 업무 우선순위를 [${t.priority}]에서 [${payload}] 수준으로 조율했습니다.`
          }
        ];
        updatedPriority = payload as TaskPriority;
        notificationMessage = `[우선순위 변경] '${t.title}' 업무 우선순위가 [${payload}]로 변경되었습니다.`;
        toastTitle = '우선순위 변경';
        toastMessage = `'${t.title}' 업무 우선순위를 변경했습니다.`;
      } else if (actionType === 'change_assignee') {
        updatedHistory = [
          ...updatedHistory,
          {
            id: `h_${Date.now()}`,
            timestamp,
            user: `${currentUser.name} (${currentUser.role})`,
            action: `현장 인력 배치 조정: 기존 담당자 [${t.assignee}]에서 [${payload}] 담당자로 재배정되었습니다.`
          }
        ];
        updatedAssignee = String(payload || t.assignee);
        notificationMessage = `[재배정 알림] '${t.title}' 업무가 ${updatedAssignee} 담당자에게 재배정되었습니다.`;
        toastTitle = '담당자 재배정';
        toastMessage = `'${t.title}' 업무 담당자를 ${updatedAssignee}(으)로 변경했습니다.`;
      }

      return {
        ...t,
        status: updatedStatus,
        priority: updatedPriority,
        assignee: updatedAssignee,
        completionReport: updatedReport,
        completedAt: updatedCompletedAt,
        comments: updatedComments,
        history: updatedHistory
      };
    });

    const newNotification: TeamNotification | null = notificationMessage
      ? {
          id: `notif_${Date.now()}`,
          taskId,
          taskTitle: targetTask.title,
          type: actionType === 'approve' || actionType === 'reject' ? '완료보고' : '등록',
          senderName: currentUser.name,
          senderRole: currentUser.role,
          message: notificationMessage,
          timestamp,
          read: false,
        }
      : null;
    const nextNotifications = newNotification ? [newNotification, ...notifications] : notifications;

    setTasks(nextTasks);
    setNotifications(nextNotifications);
    persistSharedState({ tasks: nextTasks, notifications: nextNotifications });

    if (toastTitle) {
      addToast(toastTitle, toastMessage, toastIcon, toastTone);
    }
  };

  const handleMarkAllNotificationsRead = () => {
    const visibleIds = new Set<string>(visibleNotifications.map((notification) => notification.id));
    markNotificationsReadByIds(visibleIds);
  };

  const handleNotificationBellClick = () => {
    const willOpen = !showNotifications;
    setShowNotifications(willOpen);
    if (willOpen) {
      handleMarkAllNotificationsRead();
    }
  };

  const handleNotificationClick = (taskId: string, notifId: string) => {
    markNotificationsReadByIds(new Set([notifId]));
    const notification = notifications.find((item) => item.id === notifId);
    const target =
      tasks.find((t) => t.id === taskId) ||
      tasks.find((t) => notification?.taskTitle && t.title === notification.taskTitle) ||
      tasks.find((t) => notification?.taskTitle && (t.title.includes(notification.taskTitle) || notification.taskTitle.includes(t.title)));

    if (target) {
      setActiveTab('tasks');
      setSelectedStatus('전체');
      setSearchQuery('');
      const isAssignedToCurrentUser = currentUser.role !== '팀장' && taskIncludesAssignee(target.assignee, currentUser.name);
      setShowMyTasksOnly(isAssignedToCurrentUser);
      openTaskDetail(target, isAssignedToCurrentUser);
    } else {
      setActiveTab('tasks');
      setSelectedStatus('전체');
      setSearchQuery(notification?.taskTitle || '');
      setShowMyTasksOnly(false);
      addToast('업무 확인 필요', '알림과 연결된 업무를 바로 찾지 못해 업무지정 목록에서 제목으로 검색했습니다.', '⚠️');
    }
    setShowNotifications(false);
  };

  if (requiresSupabaseLogin && !isAuthReady) {
    return (
      <SupabaseLoginGate
        users={users}
        onAuthenticated={handleAuthenticatedUser}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-indigo-600/30 selection:text-white">
      
      {/* 1. Header Banner */}
      <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 shadow-xl" id="main-app-header">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 min-h-16 py-2 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          
          {/* Logo Section */}
          <div className="flex items-center gap-3 min-w-0 xl:min-w-[250px]">
            <DMUMascot className="w-11 h-11 shrink-0 hover:rotate-6 transition-transform duration-300" />
            <div className="min-w-0">
              <h1 className="text-white font-black text-base sm:text-lg tracking-tight flex items-center gap-1.5 leading-tight sm:whitespace-nowrap">
                DMU 시설관리팀
                <span className="hidden sm:inline-flex bg-indigo-500/10 text-indigo-400 border border-indigo-505/20 font-mono text-[9px] px-2 py-0.5 rounded font-black tracking-widest uppercase">REAL-TIME</span>
              </h1>
              <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest mt-1">v1.0.4 OPS CENTER COLLABORATION</p>
            </div>
          </div>

          {/* Real-time Weather Widget (Center Top Location) */}
          <GocheokWeather />

          {/* Quick Info & User switcher / Notification */}
          <div className="flex w-full flex-wrap items-center justify-end gap-2 xl:w-auto">
            
            {/* Real-time switcher instructions (extremely descriptive) */}
            <div className="hidden">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              <span>💡 프로필을 스위칭하여 팀장-기사 간 실시간 완료 승인/알림을 실사 체험하십시오.</span>
            </div>

            {/* Browser sound alert controls */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/70 p-1">
              <button
                type="button"
                onClick={openSupplyRequest}
                className="px-3 py-2 rounded-lg text-emerald-200 hover:bg-slate-800 hover:text-white cursor-pointer flex items-center gap-2 text-sm font-black"
                title="물품 요청서(by 박희찬) 열기"
                aria-label="물품 요청서(by 박희찬) 열기"
              >
                <ExternalLink className="w-5 h-5" />
                <span className="hidden xl:flex flex-col leading-tight text-left">
                  <span>물품 요청서</span>
                  <span className="text-[11px] text-emerald-300">(by 박희찬)</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowManual(true)}
                className="px-3 py-2 rounded-lg text-indigo-200 hover:bg-slate-800 hover:text-white cursor-pointer flex items-center gap-2 text-sm font-black"
                title="사용 매뉴얼 열기"
                aria-label="사용 매뉴얼 열기"
              >
                <BookOpen className="w-5 h-5" />
                <span className="hidden xl:inline">매뉴얼</span>
              </button>
              <button
                type="button"
                onClick={handleToggleSound}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  soundEnabled
                    ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15'
                    : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
                }`}
                title={soundEnabled ? '알림음 끄기' : '알림음 켜기'}
                aria-label={soundEnabled ? '알림음 끄기' : '알림음 켜기'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={handleTestSound}
                disabled={!soundEnabled}
                className={`p-1.5 rounded-lg transition-colors ${
                  soundEnabled
                    ? 'text-indigo-300 hover:bg-slate-800 hover:text-white cursor-pointer'
                    : 'text-slate-700 cursor-not-allowed'
                }`}
                title={soundEnabled ? '알림음 테스트' : '알림음을 먼저 켜세요'}
                aria-label="알림음 테스트"
              >
                <BellRing className="w-4 h-4" />
              </button>
            </div>

            {/* Notification Center Popover Trigger */}
            <div className="relative">
              <button
                onClick={handleNotificationBellClick}
                className={`p-2 rounded-xl border transition-all cursor-pointer relative ${
                  showNotifications 
                    ? 'bg-slate-800 text-white border-slate-600' 
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                }`}
                id="notification-bell-btn"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-mono text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Box */}
              {showNotifications && (
                <div className="fixed left-3 right-3 top-20 bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 max-h-[70vh] overflow-hidden z-50 flex flex-col text-slate-200 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 sm:max-h-96">
                  <div className="p-3.5 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
                    <span className="text-xs font-black text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Bell className="w-4 h-4 text-indigo-300" />
                      실시간 Ops 알림 센터
                    </span>
                    {unreadNotifCount > 0 && (
                      <button
                        onClick={handleMarkAllNotificationsRead}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-extrabold cursor-pointer uppercase tracking-wider"
                      >
                        모두 읽음
                      </button>
                    )}
                  </div>
                  
                  <div className="flex-grow overflow-y-auto divide-y divide-slate-800/60">
                    {visibleNotifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                        현재 계정에 표시할 업무 알림이 없습니다.
                      </div>
                    ) : (
                      visibleNotifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif.taskId, notif.id)}
                          className={`p-3.5 text-left cursor-pointer transition-colors ${
                            notif.read ? 'bg-slate-900 hover:bg-slate-850 text-slate-400' : 'bg-indigo-950/30 hover:bg-indigo-950/50 border-l-2 border-indigo-500 text-slate-100'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1 text-[10px]">
                            <span className="font-extrabold text-indigo-400">{notif.senderName} ({notif.senderRole})</span>
                            <span className="text-slate-500 font-mono font-medium">
                              {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className={`text-xs leading-normal line-clamp-2 ${notif.read ? 'text-slate-400' : 'text-slate-200 font-bold'}`}>{notif.message}</p>
                          <div className="text-[9.5px] text-slate-500 mt-1 font-semibold truncate">대상: {notif.taskTitle}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {requiresSupabaseLogin ? (
              <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 font-bold leading-tight">로그인 계정</div>
                  <div className="text-sm text-white font-bold truncate">
                    {currentUser.avatar} {currentUser.name} {currentUser.role}
                  </div>
                  {authenticatedEmail && (
                    <div className="text-[10px] text-emerald-300 font-semibold truncate">{authenticatedEmail}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="로그아웃"
                  aria-label="로그아웃"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/70 px-2 py-1">
                <div className="relative">
                  <select
                    value={currentUser.id}
                    onChange={(e) => handleUserChange(e.target.value)}
                    className="max-w-[210px] px-3.5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-black font-sans outline-none cursor-pointer border border-slate-700 hover:bg-slate-800 transition-colors shadow-lg"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id} className="text-slate-100 bg-slate-900 font-black text-xs">
                        {u.avatar} {u.name} {u.role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

          </div>
        </div>
      </header>

      {/* Profile Active Status Alert Bar for Small Screen */}
      <div className="hidden">
        💡 온라인 앱에서는 등록 이메일과 비밀번호로 로그인한 본인 계정 기준으로 완료 보고서와 승인 체계를 사용합니다.
      </div>

      {/* 2. Main Work Portal Scroll Wrapper */}
      <main className="flex-grow max-w-[1500px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 flex flex-col space-y-5">
        
        {/* Statistics and Visual Indicators Block */}
        <DashboardStats 
          tasks={tasks} 
          users={users} 
          userAccessList={facilityAccess.accessList}
          currentUserId={currentUser.id}
          canManageAdminAccess={canManageAdminAccess}
          onAdminAccessChange={handleTeamAdminAccessChange}
        />

        {/* Navigation Tabs (Work Orders vs. Daily Attendance Logs) */}
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-2 bg-slate-900/85 border border-slate-700 rounded-3xl p-2.5 w-full shadow-xl" id="dashboard-tab-switcher">
          <button
            onClick={() => setActiveTab('facilities')}
            className={`min-h-[64px] sm:min-h-[72px] px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base font-black rounded-2xl transition-all cursor-pointer flex items-center justify-center space-x-2 uppercase tracking-wide ${
              activeTab === 'facilities'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-200 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            🏢 시설 CRUD
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`min-h-[64px] sm:min-h-[72px] px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base font-black rounded-2xl transition-all cursor-pointer flex items-center justify-center space-x-2 uppercase tracking-wide ${
              activeTab === 'tasks'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-200 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            📋 업무지정
          </button>
          <button
            onClick={() => setActiveTab('dailyLogs')}
            className={`min-h-[64px] sm:min-h-[72px] px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm lg:text-base font-black rounded-2xl transition-all cursor-pointer flex items-center justify-center space-x-2 uppercase tracking-wide ${
              activeTab === 'dailyLogs'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-200 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center space-x-2 font-sans justify-center text-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>📝 Self-Managed Work Logs</span>
            </div>
          </button>
          {currentFacilityRole === 'admin' && (
            <button
              onClick={() => setActiveTab('adminData')}
              className={`min-h-[64px] sm:min-h-[72px] px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base font-black rounded-2xl transition-all cursor-pointer flex items-center justify-center space-x-2 uppercase tracking-wide ${
                activeTab === 'adminData'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-200 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              🛡 관리자 화면
            </button>
          )}
          <button
            type="button"
            onClick={openSupplyRequest}
            className="min-h-[64px] sm:min-h-[72px] px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base font-black rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 text-emerald-200 hover:text-white hover:bg-emerald-600/20"
          >
            <ExternalLink className="w-5 h-5" />
            <span className="flex flex-col leading-tight">
              <span>물품 요청서</span>
              <span className="text-sm text-emerald-300">(by 박희찬)</span>
            </span>
          </button>
        </div>

        {currentUser.role !== '팀장' && (
          <section className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 text-emerald-200 font-black text-base">
                  <BellRing className="w-5 h-5 text-emerald-300" />
                  내 배정 업무 안내
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-950/70 border border-emerald-500/20 text-xs text-emerald-200 font-black">
                  진행 필요 {activeAssignedTasks.length}건
                </span>
                {unreadAssignedNotifications > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200 font-black">
                    새 알림 {unreadAssignedNotifications}건
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-200 font-semibold leading-relaxed">
                {newAssignedTasks.length > 0
                  ? `${currentUser.name}님에게 새로 배정된 접수대기 업무가 ${newAssignedTasks.length}건 있습니다. 업무지정에서 업무 접수 후 완료 내용을 입력해 주세요.`
                  : activeAssignedTasks.length > 0
                    ? `${currentUser.name}님이 처리 중이거나 승인 대기 중인 업무가 ${activeAssignedTasks.length}건 있습니다.`
                    : `${currentUser.name}님에게 현재 진행할 배정 업무는 없습니다.`}
              </p>
              {activeAssignedTasks.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeAssignedTasks.slice(0, 3).map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => {
                        setActiveTab('tasks');
                        setSelectedStatus('전체');
                        setSearchQuery('');
                        setShowMyTasksOnly(true);
                        openTaskDetail(task, true);
                      }}
                      className="max-w-full truncate rounded-xl border border-emerald-500/20 bg-slate-950/70 px-3 py-2 text-left text-xs text-slate-100 font-bold hover:border-emerald-400/60 hover:text-white"
                    >
                      [{getTaskStatusLabel(task)}] {task.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={showAssignedTaskList}
              className="shrink-0 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 text-sm font-black shadow-lg border border-emerald-400/30"
            >
              내 배정 업무 보기
            </button>
          </section>
        )}

        {activeTab === 'tasks' ? (
          <>
            {/* 3. Search and Actions Toolbar */}
        <section ref={taskListRef} className="bg-slate-900/50 backdrop-blur-md p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row gap-4 items-center justify-between scroll-mt-24" id="search-filter-toolbar">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            
            {/* Search Input Box */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="업무지정 제목, 위치, 담당자 검색..."
                className="w-full pl-10 pr-3.5 py-2.5 border border-slate-800 outline-none rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-slate-955 text-slate-100 placeholder:text-slate-650 font-semibold"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-slate-500 hover:text-white rounded-full cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Status Select Badge Filter */}
            <div className="flex items-center space-x-1.5" id="status-filter-group">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-max select-none">진행 상태:</span>
              <div className="bg-slate-950 border border-slate-850 p-1 rounded-xl flex items-center">
                {['전체', '접수대기', '작업중', '완료', '지연'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-black cursor-pointer transition-all duration-150 uppercase tracking-wider ${
                      selectedStatus === status 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
            {currentUser.role !== '팀장' && (
              <button
                type="button"
                onClick={() => setShowMyTasksOnly((value) => !value)}
                className={`px-3.5 py-2 rounded-xl border text-xs font-black transition-colors ${
                  showMyTasksOnly
                    ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                내 업무만
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 w-full md:w-auto shrink-0">
            <input
              ref={backupFileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportAppBackup}
              className="hidden"
            />
            <button
              type="button"
              onClick={handleExportTasksCsv}
              disabled={filteredTasks.length === 0}
              className={`px-3.5 py-2.5 rounded-xl border text-xs font-black flex items-center gap-1.5 ${
                filteredTasks.length === 0
                  ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                  : 'bg-slate-950 text-slate-200 border-slate-800 hover:border-indigo-500/40 hover:text-white cursor-pointer'
              }`}
              title="현재 필터 결과를 엑셀에서 열 수 있는 CSV로 저장"
            >
              <Download className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">CSV 저장</span>
            </button>
            <button
              type="button"
              onClick={handleExportAppBackup}
              className="px-3.5 py-2.5 rounded-xl border text-xs font-black flex items-center gap-1.5 bg-slate-950 text-slate-200 border-slate-800 hover:border-emerald-500/40 hover:text-white cursor-pointer"
                title="업무지정, 알림, 셀프 근무일지, 캘린더 설정 전체 백업"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">전체 백업</span>
            </button>
            <button
              type="button"
              onClick={() => backupFileInputRef.current?.click()}
              className="px-3.5 py-2.5 rounded-xl border text-xs font-black flex items-center gap-1.5 bg-slate-950 text-slate-200 border-slate-800 hover:border-amber-500/40 hover:text-white cursor-pointer"
              title="이전에 저장한 시설관리 백업 파일 복원"
            >
              <Upload className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">복원</span>
            </button>
            {/* View Mode Grid/Table toggle */}
            <div className="flex items-center border border-slate-800 rounded-xl p-1 bg-slate-950">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${viewMode === 'grid' ? 'bg-slate-800 text-indigo-400' : 'text-slate-500'}`}
                title="카드 리스트형 보기"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${viewMode === 'table' ? 'bg-slate-800 text-indigo-400' : 'text-slate-500'}`}
                title="단순 표형 보기"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Manager: Issue task directive trigger */}
            {currentUser.role === '팀장' ? (
              <button
                onClick={() => setIsNewTaskOpen(true)}
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-indigo-500/10 cursor-pointer flex items-center justify-center space-x-1.5 border border-indigo-500/30"
                id="issue-task-btn"
              >
                <Plus className="w-4 h-4" />
                <span>업무지정 내용</span>
              </button>
            ) : (
              <div className="text-right text-[10px] text-slate-400 uppercase font-black bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>{currentUser.name} {currentUser.role} 상태 | 셀프 근무일지 기록 가능</span>
              </div>
            )}
          </div>
        </section>

        {/* 4. Filter Display Info */}
        {(selectedStatus !== '전체' || searchQuery || showMyTasksOnly) && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl px-4.5 py-3 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-extrabold uppercase tracking-wider text-[10.5px]">
              필터 적용 중: 상태(<span className="text-white font-black">{selectedStatus}</span>)
              {searchQuery && ` | 검색 단어("${searchQuery}")`}
              {showMyTasksOnly && ` | 담당자("${currentUser.name}")`}
              <span className="text-indigo-400 font-bold ml-2">(검색 결과 {filteredTasks.length}건)</span>
            </span>
            <button
              onClick={() => {
                setSelectedStatus('전체');
                setSearchQuery('');
                setShowMyTasksOnly(false);
              }}
              className="text-indigo-400 hover:text-indigo-300 text-[11px] font-black underline cursor-pointer uppercase tracking-wider"
            >
              필터 초기화
            </button>
          </div>
        )}

        {/* 5. Main task displays (Empty vs Grid vs Table) */}
        {filteredTasks.length === 0 ? (
          <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl border border-slate-800 flex flex-col items-center justify-center py-20 px-4 min-h-[300px]">
            <ClipboardList className="w-12 h-12 text-slate-700 mb-3" />
            <h3 className="text-white font-black text-sm tracking-tight">해당 조건에 만족하는 업무지정이 없습니다.</h3>
            <p className="text-xs text-slate-400 mt-2 max-w-[320px] text-center font-semibold leading-relaxed">
              선택한 상태나 검색 키워드에 해당하는 항목을 찾을 수 없습니다. 필터를 초기화해 전체 업무 목록을 볼 수 있습니다.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" id="tasks-grid">
            {filteredTasks.map((task) => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onSelect={(t) => openTaskDetail(t)} 
                onAssigneeAction={handleAssigneeTaskAction}
                isSynced={syncedTaskIds.includes(task.id)}
                isCurrentUserAssignee={currentUser.role !== '팀장' && taskIncludesAssignee(task.assignee, currentUser.name)}
              />
            ))}
          </div>
        ) : (
          /* Table Layout Option for Desk */
          <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl border border-slate-800 overflow-hidden shadow-xl" id="tasks-table">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-black text-[10px] uppercase tracking-widest select-none">
                    <th className="p-4 w-18">상태</th>
                    <th className="p-4 w-32">업무구분</th>
                    <th className="p-4">업무지정명</th>
                    <th className="p-4 w-40">설비 현장 위치</th>
                    <th className="p-4 w-36">현장 배정인원</th>
                    <th className="p-4 w-16">우선순위</th>
                    <th className="p-4 w-20">등록일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                  {filteredTasks.map((t) => {
                    const statusLabel = getTaskStatusLabel(t);

                    return (
                    <tr 
                      key={t.id}
                      onClick={() => openTaskDetail(t)}
                      className="hover:bg-slate-900/40 cursor-pointer transition-colors"
                    >
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          statusLabel === '지연' ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20' :
                          statusLabel === '완료' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          statusLabel === '작업중' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse' :
                          'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          {t.category}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-extrabold text-white line-clamp-1">{t.title}</div>
                        {t.comments.length > 0 && (
                          <span className="text-[10px] text-indigo-400 font-black">[{t.comments.length}] 의견 공유중</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-400 truncate max-w-[150px]">{t.location}</td>
                      <td className="p-4 font-black text-slate-200">{formatTaskAssigneeLabel(t.assignee)}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider ${
                          t.priority === '긴급' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                          t.priority === '보통' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 font-mono text-[10px]">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <GoogleCalendarSyncPanel 
          tasks={tasks}
          addToast={addToast}
          syncedTaskIds={syncedTaskIds}
          onTasksSynced={setSyncedTaskIds}
          webAppUrl={calendarWebAppUrl}
          webhookSecret={calendarWebhookSecret}
          onWebAppUrlChange={setCalendarWebAppUrl}
          onWebhookSecretChange={setCalendarWebhookSecret}
        />
          </>
        ) : activeTab === 'dailyLogs' ? (
          <DailyWorkLogs
            currentUser={currentUser}
            dailyLogs={dailyLogs}
            setDailyLogs={setDailyLogs}
            users={users}
            addToast={addToast}
          />
        ) : activeTab === 'adminData' ? (
          <AdminDataCenter
            createSnapshot={createAppSnapshot}
            onApplySnapshot={applyAppSnapshot}
            addToast={addToast}
            isAdmin={currentFacilityRole === 'admin'}
          />
        ) : (
          <FacilityAdminPage
            role={currentFacilityRole}
            currentUser={currentUser}
            tasks={tasks}
            dailyLogs={dailyLogs}
            addToast={addToast}
          />
        )}

        <SharedDataServerPanel
          createSnapshot={createAppSnapshot}
          onApplySnapshot={applyAppSnapshot}
          addToast={addToast}
        />

      </main>

      {/* 6. Page Footer */}
      <footer className="bg-slate-950/20 border-t border-slate-900 mt-20 py-8 text-center select-none shrink-0 text-slate-500 font-semibold text-xs">
        <p>© 2026 FM COMMAND 스마트 시설관리 시스템. All rights reserved.</p>
        <p className="text-[10px] text-slate-600 mt-2 font-black uppercase tracking-widest">REAL-TIME FIELD OPS INTEGRATION PLATFORM</p>
      </footer>

      {/* 7. Toast Alerts Panel Container */}
      <div className="fixed bottom-5 right-5 z-55 max-w-sm space-y-2" id="toasts-portal">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="bg-slate-900/95 backdrop-blur-md shadow-xl border border-slate-800 rounded-2xl p-4 flex items-start space-x-3 text-white animate-slide-in relative overflow-hidden"
          >
            {toast.avatar && (
              <div className="text-xl shrink-0 mt-0.5">{toast.avatar}</div>
            )}
            <div>
              <h4 className="font-bold text-xs text-indigo-400">{toast.title}</h4>
              <p className="text-[11px] text-slate-200 mt-1 leading-normal">{toast.message}</p>
            </div>
            {/* Countdown visual line */}
            <div className="absolute bottom-0 left-0 h-1 bg-indigo-500 animate-shrink-width" style={{ width: '100%' }}></div>
          </div>
        ))}
      </div>

      {/* 8. Modals */}
      <NewTaskModal
        isOpen={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        onSave={handleSaveNewTask}
        users={users}
      />

      <SystemManualModal
        isOpen={showManual}
        onClose={() => setShowManual(false)}
      />

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={closeTaskDetail}
          currentUser={currentUser}
          focusActionPanel={focusTaskActionPanel}
          onUpdateStatus={handleUpdateStatus}
          onSubmitCompletion={handleSubmitCompletion}
          onAddComment={handleAddComment}
          onAttachPhoto={handleAttachTaskPhoto}
          onManagerAction={handleManagerAction}
          allUsers={users}
          isSynced={syncedTaskIds.includes(selectedTask.id)}
          gcalToken={calendarWebAppUrl}
          onSyncSingle={async (task) => {
            if (!calendarWebAppUrl) return;
            try {
              await syncTaskToGoogleCalendar(task, calendarWebAppUrl, calendarWebhookSecret);
              setSyncedTaskIds((prev) => [...prev, task.id]);
              addToast(
                '공유캘린더 전송 요청 완료',
                `'${task.title}' 오더를 ${FACILITY_SHARED_CALENDAR_NAME} 웹앱으로 보냈습니다. 캘린더에서 일정 생성을 확인해 주세요.`,
                '📅'
              );
            } catch (err) {
              console.error(err);
              addToast('동기화 처리 실패', getErrorMessage(err, 'API 연동 에러'), '⚠️');
            }
          }}
        />
      )}

    </div>
  );
}
