import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Bell,
  BookOpen,
  Boxes,
  Building2,
  CalendarCheck2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Grid2X2,
  ShieldCheck,
  Table2,
} from 'lucide-react';
import { useFacilities } from '../../facility/useFacilities';
import { useReservations } from '../../facility/useReservations';
import { useInspectionSchedules } from '../../facility/useInspectionSchedules';
import { useFacilityAssets } from '../../facility/useFacilityAssets';
import { useFacilityNotifications } from '../../facility/useFacilityNotifications';
import { buildWorkLedgerEntries } from '../../facility/workLedger';
import { WORK_UNIT_DEFINITIONS } from '../../facility/workUnitData';
import { hasReservationErrors, validateReservationForm } from '../../facility/reservationValidation';
import {
  canManageAssets,
  canManageFacilities,
  canManageInspections,
  canManageReservations,
} from '../../facility/permissionPolicy';
import {
  Facility,
  FacilityReservation,
  FacilityFormValues,
  FacilityRole,
  FacilityAssetCondition,
  FacilityAssetStatus,
  InspectionFormValues,
  ReservationFormValues,
  ReservationStatus,
} from '../../facility/types';
import { DailyLog, Task, UserProfile } from '../../types';
import FacilityCard from './FacilityCard';
import FacilityDetailPanel from './FacilityDetailPanel';
import FacilityDashboardPanel from './FacilityDashboardPanel';
import FacilityFilters from './FacilityFilters';
import FacilityFormPanel from './FacilityFormPanel';
import FacilityListSkeleton from './FacilityListSkeleton';
import FacilityTable from './FacilityTable';
import FacilityInspectionSchedulePanel from './FacilityInspectionSchedulePanel';
import FacilityAssetPanel from './FacilityAssetPanel';
import ReservationFormPanel from './ReservationFormPanel';
import ReservationListPanel from './ReservationListPanel';
import FacilityNotificationPanel from './FacilityNotificationPanel';
import WorkLedgerPanel from './WorkLedgerPanel';
import WorkUnitManualPanel from './WorkUnitManualPanel';

interface FacilityAdminPageProps {
  role: FacilityRole;
  currentUser: UserProfile;
  tasks: Task[];
  dailyLogs: DailyLog[];
  addToast: (title: string, message: string, avatar?: string) => void;
}

const roleLabel = {
  admin: '관리자',
  staff: '교직원',
  user: '학생',
};

type FacilityViewMode = 'cards' | 'table';
type FacilitySectionId = 'summary' | 'notifications' | 'manual' | 'ledger' | 'inspections' | 'assets' | 'facilities' | 'usage';

interface FacilitySectionOption {
  id: FacilitySectionId;
  title: string;
  meta: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface FacilitySectionTileProps {
  key?: React.Key;
  option: FacilitySectionOption;
  active: boolean;
  onClick: () => void;
}

function FacilitySectionTile({ option, active, onClick }: FacilitySectionTileProps) {
  const Icon = option.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
        active
          ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-950/30'
          : 'bg-slate-900/50 text-slate-300 border-slate-800 hover:border-indigo-500/40 hover:text-white'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-indigo-300'}`} />
          <span className="text-xs font-black truncate">{option.title}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${active ? 'rotate-180 text-white' : 'text-slate-500'}`} />
      </div>
      <p className={`text-[10px] font-bold mt-1 truncate ${active ? 'text-indigo-100' : 'text-slate-500'}`}>
        {option.meta}
      </p>
    </button>
  );
}

export default function FacilityAdminPage({
  role,
  currentUser,
  tasks,
  dailyLogs,
  addToast,
}: FacilityAdminPageProps) {
  const store = useFacilities();
  const reservations = useReservations({ id: currentUser.id, name: currentUser.name, role });
  const inspections = useInspectionSchedules();
  const assets = useFacilityAssets();
  const notifications = useFacilityNotifications({ id: currentUser.id, role });
  const [selected, setSelected] = useState<Facility | null>(null);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [editingReservation, setEditingReservation] = useState<FacilityReservation | null>(null);
  const [viewMode, setViewMode] = useState<FacilityViewMode>('cards');
  const [isFacilityListOpen, setFacilityListOpen] = useState(false);
  const [isFacilityFormOpen, setFacilityFormOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<FacilitySectionId | null>(null);
  const facilityFormRef = useRef<HTMLDivElement>(null);
  const canManage = canManageFacilities(role);
  const canRegisterUsageSchedule = canManageReservations(role);
  const workLedgerEntries = useMemo(() => buildWorkLedgerEntries({
    tasks,
    dailyLogs,
    inspectionSchedules: inspections.schedules,
  }), [dailyLogs, inspections.schedules, tasks]);

  useEffect(() => {
    store.setPage(1);
  }, [store.query, store.category, store.status]);

  const sectionOptions: FacilitySectionOption[] = [
    ...(role === 'admin'
      ? [{
          id: 'summary' as const,
          title: '시설 요약',
          meta: `시설 ${store.facilities.length}개`,
          icon: CalendarDays,
        }]
      : []),
    {
      id: 'notifications',
      title: '시설 알림',
      meta: `읽지 않음 ${notifications.unreadCount}건`,
      icon: Bell,
    },
    {
      id: 'manual',
      title: '단위업무 매뉴얼',
      meta: `${WORK_UNIT_DEFINITIONS.length}개 업무 기준`,
      icon: BookOpen,
    },
    {
      id: 'ledger',
      title: '업무실적 누적대장',
      meta: `${workLedgerEntries.length}건 누적`,
      icon: Activity,
    },
    {
      id: 'inspections',
      title: '점검일정',
      meta: `${inspections.schedules.length}건`,
      icon: CalendarCheck2,
    },
    {
      id: 'assets',
      title: '시설 자산관리',
      meta: `${assets.assets.length}건`,
      icon: Boxes,
    },
    {
      id: 'facilities',
      title: '대관 시설 목록/ 등록',
      meta: `${store.filtered.length}개 시설`,
      icon: Building2,
    },
    {
      id: 'usage',
      title: '주요 일정',
      meta: `${reservations.visibleReservations.length + tasks.length + dailyLogs.length}건`,
      icon: ClipboardList,
    },
  ];

  const openSection = (section: FacilitySectionId) => {
    setActiveSection((current) => (current === section ? null : section));
    if (section === 'facilities') setFacilityListOpen(true);
  };

  const saveForm = (values: FacilityFormValues) => {
    store.setQuery('');
    store.setCategory('전체');
    store.setStatus('전체');
    store.setPage(1);
    setFacilityListOpen(true);
    setViewMode('cards');

    if (editing) {
      const savedFacility = store.saveFacility(editing.id, values);
      if (savedFacility) setSelected(savedFacility);
      addToast('대관 시설 수정 완료', `${values.name} 시설 정보를 수정했습니다.`, '🏢');
      setEditing(null);
      return;
    }
    const createdFacility = store.addFacility(values);
    setSelected(createdFacility);
    addToast('대관 시설 등록 완료', `${values.name} 시설을 등록했습니다.`, '🏢');
  };

  const startFacilityEdit = (facility: Facility) => {
    setEditing(facility);
    setSelected(facility);
    setFacilityFormOpen(true);
    window.requestAnimationFrame(() => {
      facilityFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const deleteFacility = (id: string) => {
    const target = store.facilities.find((facility) => facility.id === id);
    if (!target || !window.confirm(`${target.name} 시설을 삭제하시겠습니까?`)) return;
    store.deleteFacility(id);
    if (selected?.id === id) setSelected(null);
    addToast('대관 시설 삭제 완료', `${target.name} 시설을 삭제했습니다.`, '🗑️');
  };

  const saveUsageSchedule = (values: ReservationFormValues) => {
    if (!canRegisterUsageSchedule) {
      addToast('주요 일정 등록 권한 없음', '주요 일정은 시설관리팀 관리자만 등록할 수 있습니다.', '⚠️');
      return;
    }

    const errors = validateReservationForm(
      values,
      store.facilities,
      reservations.reservations,
      new Date(),
      editingReservation?.id,
    );
    const facility = store.facilities.find((item) => item.id === values.facilityId) || {
      id: '',
      name: values.location.trim() || values.title.trim() || '-',
      category: '강의실' as Facility['category'],
      capacity: 0,
      location: values.location.trim(),
      description: values.purpose.trim(),
      status: '운영중' as Facility['status'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (hasReservationErrors(errors)) {
      addToast(
        '주요 일정 등록 실패',
        errors.overlap || errors.startAt || errors.facilityId || errors.requesterOrganization || errors.purpose || '주요 일정 정보를 확인하세요.',
        '⚠️',
      );
      return;
    }

    if (editingReservation) {
      reservations.saveReservation(editingReservation.id, values, facility);
      addToast('주요 일정 수정 완료', `${facility.name} 주요 일정 정보를 수정했습니다.`, '📅');
      setEditingReservation(null);
      return;
    }

    reservations.addReservation(values, facility);
    addToast('주요 일정 등록 완료', `${facility.name} 주요 일정이 등록되었습니다.`, '📅');
  };

  const changeReservationStatus = (id: string, status: ReservationStatus, reason?: string) => {
    if (!canRegisterUsageSchedule) return;
    reservations.changeStatus(id, status, reason);
    if (editingReservation?.id === id && status === 'cancelled') setEditingReservation(null);
    addToast('주요 일정 상태 변경', `주요 일정 상태를 ${status} 상태로 변경했습니다.`, '📅');
  };

  const completeInspection = (id: string) => {
    if (!canManageInspections(role)) return;
    inspections.completeSchedule(id);
    addToast('점검 완료', '시설 점검일정을 완료 처리했습니다.', '✅');
  };

  const addInspection = (values: InspectionFormValues) => {
    if (!canManageInspections(role)) return;
    const facility = store.facilities.find((item) => item.id === values.facilityId);
    if (!facility) {
      addToast('점검일정 등록 실패', '대상 시설을 먼저 확인해 주세요.', '⚠️');
      return;
    }

    inspections.addSchedule(values, facility);
    addToast('점검일정 등록 완료', `${facility.name} 점검일정이 등록되었습니다.`, '📅');
  };

  const reopenInspection = (id: string) => {
    if (!canManageInspections(role)) return;
    inspections.reopenSchedule(id);
    addToast('점검 예정 전환', '시설 점검일정을 다시 예정 상태로 돌렸습니다.', '📅');
  };

  const changeAssetCondition = (id: string, condition: FacilityAssetCondition) => {
    if (!canManageAssets(role)) return;
    assets.changeCondition(id, condition);
    addToast('자산 상태 갱신', '시설 자산 상태를 갱신했습니다.', '📦');
  };

  const changeAssetStatus = (id: string, status: FacilityAssetStatus) => {
    if (!canManageAssets(role)) return;
    assets.changeStatus(id, status);
    addToast('자산 사용상태 갱신', '시설 자산 사용상태를 갱신했습니다.', '📦');
  };

  return (
    <section className="space-y-5">
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-white font-black text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            시설 관리 MVP
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-semibold">
            대관 시설과 업무지정, 자기관리 업무, 직접 입력 일정을 주요 일정으로 함께 관리합니다.
          </p>
        </div>
        <div className="px-3.5 py-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-black flex items-center gap-2 w-max">
          <ShieldCheck className="w-4 h-4" />
          현재 권한: {roleLabel[role]}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {sectionOptions.map((option) => (
          <FacilitySectionTile
            key={option.id}
            option={option}
            active={activeSection === option.id}
            onClick={() => openSection(option.id)}
          />
        ))}
      </div>

      {activeSection === 'facilities' && (
        <FacilityFilters
          query={store.query}
          category={store.category}
          status={store.status}
          onQueryChange={store.setQuery}
          onCategoryChange={store.setCategory}
          onStatusChange={store.setStatus}
        />
      )}

      {role === 'admin' && activeSection === 'summary' && (
        <FacilityDashboardPanel
          facilities={store.facilities}
          reservations={reservations.reservations}
        />
      )}

      {activeSection === 'notifications' && (
        <FacilityNotificationPanel
          notifications={notifications.visibleNotifications}
          unreadCount={notifications.unreadCount}
          onRead={notifications.markAsRead}
          onReadAll={notifications.markAllAsRead}
        />
      )}

      {activeSection === 'manual' && <WorkUnitManualPanel definitions={WORK_UNIT_DEFINITIONS} />}

      {activeSection === 'ledger' && <WorkLedgerPanel entries={workLedgerEntries} role={role} />}

      {activeSection === 'inspections' && (
        <FacilityInspectionSchedulePanel
          facilities={store.facilities}
          schedules={inspections.pageItems}
          page={inspections.page}
          pageCount={inspections.pageCount}
          role={role}
          onAdd={addInspection}
          onPageChange={inspections.setPage}
          onComplete={completeInspection}
          onReopen={reopenInspection}
        />
      )}

      {activeSection === 'assets' && (
        <FacilityAssetPanel
          assets={assets.pageItems}
          page={assets.page}
          pageCount={assets.pageCount}
          role={role}
          onPageChange={assets.setPage}
          onConditionChange={changeAssetCondition}
          onStatusChange={changeAssetStatus}
        />
      )}

      {activeSection === 'facilities' && (
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-8 space-y-4">
          <button
            type="button"
            onClick={() => setFacilityListOpen((open) => !open)}
            aria-expanded={isFacilityListOpen}
            className="w-full flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-left hover:border-indigo-500/40 transition-colors"
          >
            <div>
              <h3 className="text-white text-sm font-black">대관 시설 목록</h3>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                {store.filtered.length}개 시설 · 목록 관리
              </p>
            </div>
            <ChevronDown className={`w-4 h-4 text-indigo-300 transition-transform ${isFacilityListOpen ? 'rotate-180' : ''}`} />
          </button>

          {isFacilityListOpen && (
            <>
              <div className="flex justify-end">
                <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950 p-1 w-max">
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    title="카드 보기"
                    className={`p-2 rounded-lg ${viewMode === 'cards' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}
                  >
                    <Grid2X2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    title="표 보기"
                    className={`p-2 rounded-lg ${viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}
                  >
                    <Table2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {store.isLoading ? (
                <FacilityListSkeleton />
              ) : store.pageItems.length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 text-xs font-bold">
                  조건에 맞는 시설이 없습니다.
                </div>
              ) : viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {store.pageItems.map((facility) => (
                    <FacilityCard
                      key={facility.id}
                      facility={facility}
                      canManage={canManage}
                      onEdit={startFacilityEdit}
                      onDelete={deleteFacility}
                      onSelect={setSelected}
                    />
                  ))}
                </div>
              ) : (
                <FacilityTable
                  facilities={store.pageItems}
                  canManage={canManage}
                  onEdit={startFacilityEdit}
                  onDelete={deleteFacility}
                  onSelect={setSelected}
                />
              )}
              <div className="flex items-center justify-between bg-slate-900/40 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-black">
                <span className="text-slate-400">{store.filtered.length}개 시설 / {store.page}페이지</span>
                <div className="flex gap-2">
                  <button disabled={store.page === 1} onClick={() => store.setPage(store.page - 1)} className="p-2 rounded-xl bg-slate-950 border border-slate-800 disabled:text-slate-700">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button disabled={store.page === store.pageCount} onClick={() => store.setPage(store.page + 1)} className="p-2 rounded-xl bg-slate-950 border border-slate-800 disabled:text-slate-700">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        <aside className="xl:col-span-4 space-y-4">
          <div ref={facilityFormRef} className="space-y-3">
            <button
              type="button"
              onClick={() => setFacilityFormOpen((open) => !open)}
              aria-expanded={isFacilityFormOpen}
              className="w-full flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-left hover:border-indigo-500/40 transition-colors"
            >
              <div>
                <h3 className="text-white text-sm font-black">{editing ? '대관 시설 수정' : '대관 시설 등록'}</h3>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                  대관 시설 정보 입력
                </p>
              </div>
              <ChevronDown className={`w-4 h-4 text-indigo-300 transition-transform ${isFacilityFormOpen ? 'rotate-180' : ''}`} />
            </button>

            {isFacilityFormOpen && (
              canManage ? (
                <FacilityFormPanel editingFacility={editing} onSubmit={saveForm} onCancelEdit={() => setEditing(null)} />
              ) : (
                <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 text-xs text-slate-400 font-bold">
                  대관 시설 등록, 수정, 삭제는 관리자 권한에서만 가능합니다.
                </div>
              )
            )}
          </div>
          <FacilityDetailPanel facility={selected} canManage={canManage} onEdit={startFacilityEdit} />
        </aside>
      </div>
      )}

      {activeSection === 'usage' && (
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-4">
          {canRegisterUsageSchedule ? (
            <ReservationFormPanel
              facilities={store.facilities}
              reservations={reservations.reservations}
              editingReservation={editingReservation}
              onSubmit={saveUsageSchedule}
              onCancelEdit={() => setEditingReservation(null)}
            />
          ) : (
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 text-xs text-slate-400 font-bold leading-relaxed">
              주요 일정 등록은 시설관리팀 관리자 권한에서만 가능합니다. 업무지정과 자기관리 업무는 자동으로 주요 일정에 함께 표시됩니다.
            </div>
          )}
        </div>
        <div className="xl:col-span-8">
          <ReservationListPanel
            reservations={reservations.visibleReservations}
            exportReservations={reservations.visibleReservations}
            tasks={tasks}
            dailyLogs={dailyLogs}
            role={role}
            onEdit={setEditingReservation}
            onStatusChange={changeReservationStatus}
          />
        </div>
      </div>
      )}

    </section>
  );
}
