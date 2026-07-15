import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Clock, ShieldAlert } from 'lucide-react';
import type { FacilityUserAccess } from '../facility/types';
import { isReadOnlyFacilityUser } from '../facility/userAccessState';
import { isApprovalPending, isCompletionApproved, isTaskDelayed } from '../lib/taskState';
import { taskIncludesAssignee } from '../lib/taskAssignees';
import { Task, UserProfile } from '../types';

interface DashboardStatsProps {
  tasks: Task[];
  users: UserProfile[];
  userAccessList: FacilityUserAccess[];
  currentUserId: string;
  canManageAdminAccess: boolean;
  onAdminAccessChange: (userId: string, isAdmin: boolean) => void;
  canEditUserProfiles: boolean;
  onUserProfileChange: (userId: string, updates: Pick<UserProfile, 'name' | 'role'>) => void;
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  caption: string;
  tone: 'emerald' | 'rose' | 'amber' | 'indigo';
}

const toneClass = {
  emerald: {
    icon: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    value: 'text-emerald-400',
  },
  rose: {
    icon: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    value: 'text-rose-400',
  },
  amber: {
    icon: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    value: 'text-amber-400',
  },
  indigo: {
    icon: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    value: 'text-indigo-400',
  },
};

export default function DashboardStats({
  tasks,
  users,
  userAccessList,
  currentUserId,
  canManageAdminAccess,
  onAdminAccessChange,
  canEditUserProfiles,
  onUserProfileChange,
}: DashboardStatsProps) {
  const accessByUserId = useMemo(() => new Map(userAccessList.map((item) => [item.userId, item])), [userAccessList]);
  const [profileDrafts, setProfileDrafts] = useState<Record<string, Pick<UserProfile, 'name' | 'role'>>>({});
  const total = tasks.length;
  const approved = tasks.filter(isCompletionApproved).length;
  const approvalPending = tasks.filter(isApprovalPending).length;
  const inProgress = tasks.filter((task) => task.status === '진행중' && !isTaskDelayed(task)).length;
  const pending = tasks.filter((task) => task.status === '대기중').length;
  const urgent = tasks.filter((task) => task.priority === '긴급' && task.status !== '완료').length;
  const completionRate = total > 0 ? Math.round((approved / total) * 100) : 0;
  const adminCount = users.filter((user) => accessByUserId.get(user.id)?.role === 'admin').length;

  useEffect(() => {
    setProfileDrafts(Object.fromEntries(users.map((user) => [user.id, {
      name: user.name,
      role: user.role,
    }])));
  }, [users]);

  const getUserTaskCount = (userName: string, status?: '대기중' | '진행중' | '완료') =>
    tasks.filter((task) => {
      const matchesUser = taskIncludesAssignee(task.assignee, userName);
      if (status === '진행중') return matchesUser && task.status === status && !isTaskDelayed(task);
      return status ? matchesUser && task.status === status : matchesUser;
    }).length;

  const getUserDelayedTaskCount = (userName: string) =>
    tasks.filter((task) => taskIncludesAssignee(task.assignee, userName) && isTaskDelayed(task)).length;

  const updateProfileDraft = (userId: string, field: 'name' | 'role', value: string) => {
    setProfileDrafts((previous) => ({
      ...previous,
      [userId]: {
        ...(previous[userId] || { name: '', role: '' }),
        [field]: value,
      },
    }));
  };

  const commitProfileDraft = (user: UserProfile) => {
    const draft = profileDrafts[user.id];
    if (!draft) return;

    const nextName = draft.name.trim();
    const nextRole = draft.role.trim();
    if (nextName === user.name && nextRole === user.role) return;
    onUserProfileChange(user.id, { name: nextName, role: nextRole });
  };

  return (
    <div className="space-y-3 mb-4" id="dashboard-stats-container">
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <CompletionCard
          approved={approved}
          approvalPending={approvalPending}
          completionRate={completionRate}
          total={total}
        />
        <StatCard
          icon={ShieldAlert}
          label="미완료 긴급 업무"
          value={`${urgent}건`}
          caption="우선 조치"
          tone="rose"
        />
        <StatCard
          icon={Clock}
          label="진행중"
          value={`${inProgress}건`}
          caption="실시간 배정"
          tone="amber"
        />
        <StatCard
          icon={BarChart3}
          label="접수대기"
          value={`${pending}건`}
          caption="신규 업무"
          tone="indigo"
        />
      </section>

      <section className="bg-slate-900/75 backdrop-blur-md p-5 rounded-3xl border border-slate-700/80 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h4 className="text-white text-lg font-black tracking-tight">
            담당자별 업무 진행현황
          </h4>
          <span className="text-xs font-black text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 rounded-xl shrink-0">
            {users.length}명 / 관리자 {adminCount}명
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {users.map((user) => {
            const access = accessByUserId.get(user.id);
            const isAdmin = access?.role === 'admin';
            const isReadOnly = isReadOnlyFacilityUser(user);
            const profileDraft = profileDrafts[user.id] || { name: user.name, role: user.role };
            const activeCount = getUserTaskCount(user.name, '진행중');
            const completedCount = getUserTaskCount(user.name, '완료');
            const delayedCount = getUserDelayedTaskCount(user.name);

            return (
              <div
                key={user.id}
                className="rounded-2xl border border-slate-700/80 bg-slate-950/90 p-4 shadow-inner"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-2xl shrink-0">{user.avatar}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {canEditUserProfiles ? (
                          <>
                            <input
                              type="text"
                              value={profileDraft.name}
                              onChange={(event) => updateProfileDraft(user.id, 'name', event.target.value)}
                              onBlur={() => commitProfileDraft(user)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') event.currentTarget.blur();
                              }}
                              aria-label={`${user.name} 이름`}
                              className="min-w-0 w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-base text-white font-black outline-none focus:border-emerald-400"
                            />
                            <input
                              type="text"
                              value={profileDraft.role}
                              onChange={(event) => updateProfileDraft(user.id, 'role', event.target.value)}
                              onBlur={() => commitProfileDraft(user)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') event.currentTarget.blur();
                              }}
                              aria-label={`${user.name} 직책`}
                              className="w-16 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 font-black outline-none focus:border-emerald-400"
                            />
                          </>
                        ) : (
                          <>
                            <span className="text-base text-white font-black truncate">{user.name}</span>
                            <span className="text-xs text-slate-300 font-black shrink-0">{user.role}</span>
                          </>
                        )}
                      </div>
                      <label className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-300 font-black">
                        <input
                          type="checkbox"
                          checked={isAdmin}
                          disabled={!canManageAdminAccess || user.id === currentUserId || isReadOnly}
                          onChange={(event) => onAdminAccessChange(user.id, event.target.checked)}
                          title={isReadOnly ? '읽기 전용 계정은 관리자 권한을 줄 수 없습니다.' : canManageAdminAccess ? '나형석 팀장만 관리자 권한을 변경할 수 있습니다.' : '관리자 지정 권한은 나형석 팀장에게만 있습니다.'}
                          className="w-4 h-4 accent-indigo-500 disabled:opacity-40"
                        />
                        관리자
                        {isReadOnly && (
                          <span className="rounded-md border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-300">
                            읽기 전용
                          </span>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4 font-mono text-xs">
                  <span className="px-2 py-2 bg-amber-500/15 text-amber-200 rounded-xl font-black text-center border border-amber-500/20">진행중 {activeCount}</span>
                  <span className="px-2 py-2 bg-emerald-500/15 text-emerald-200 rounded-xl font-black text-center border border-emerald-500/20">완료 {completedCount}</span>
                  <span className="px-2 py-2 bg-rose-500/15 text-rose-200 rounded-xl font-black text-center border border-rose-500/20">지연 {delayedCount}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function CompletionCard({
  approved,
  approvalPending,
  completionRate,
  total,
}: {
  approved: number;
  approvalPending: number;
  completionRate: number;
  total: number;
}) {
  return (
    <div className="bg-slate-900/75 backdrop-blur-md p-5 rounded-3xl border border-slate-700/80 shadow-xl flex items-center justify-between min-h-[118px]">
      <div>
        <span className="text-xs uppercase font-black tracking-widest text-slate-300 block mb-1">전체 업무 완료율</span>
        <h3 className="text-4xl font-black text-white font-mono tracking-tight">{completionRate}%</h3>
        <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
          총 {total}건 중 <span className="font-extrabold text-emerald-300">{approved}건 승인완료</span>
          {approvalPending > 0 && <span className="font-extrabold text-amber-300"> / {approvalPending}건 승인대기</span>}
        </p>
      </div>
      <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
        <svg className="w-full h-full transform -rotate-90" aria-hidden="true">
          <circle cx="28" cy="28" r="22" className="stroke-slate-800" strokeWidth="5" fill="transparent" />
          <circle
            cx="28"
            cy="28"
            r="22"
            className="stroke-emerald-400 transition-all duration-500 ease-out"
            strokeWidth="5"
            fill="transparent"
            strokeDasharray={2 * Math.PI * 22}
            strokeDashoffset={2 * Math.PI * 22 * (1 - completionRate / 100)}
          />
        </svg>
        <div className="absolute text-white font-black text-[10px] font-mono">
          {approved}/{total}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, caption, tone }: StatCardProps) {
  const classes = toneClass[tone];

  return (
    <div className="bg-slate-900/75 backdrop-blur-md p-5 rounded-3xl border border-slate-700/80 shadow-xl flex items-center gap-4 min-h-[118px]">
      <div className={`p-3.5 rounded-2xl border ${classes.icon}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <span className="text-xs uppercase font-black tracking-widest text-slate-300 block leading-tight">{label}</span>
        <h3 className={`text-4xl font-black font-mono tracking-tight mt-1 ${classes.value}`}>{value}</h3>
        <span className="text-xs text-slate-300 font-black uppercase tracking-wider">{caption}</span>
      </div>
    </div>
  );
}
