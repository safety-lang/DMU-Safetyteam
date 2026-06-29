import type { DailyLog, Task } from '../types';
import { getTaskStatusLabel } from '../lib/taskState';
import { DEFAULT_DAILY_LOG_WORK_TYPE } from '../lib/dailyLogWorkTypes';
import { WORK_UNIT_DEFINITIONS, getWorkUnitById } from './workUnitData';
import type {
  FacilityInspectionSchedule,
  WorkLedgerEntry,
  WorkUnitDefinition,
} from './types';

interface WorkLedgerSources {
  tasks: Task[];
  dailyLogs: DailyLog[];
  inspectionSchedules?: FacilityInspectionSchedule[];
}

const fallbackUnit = WORK_UNIT_DEFINITIONS[0];

const pickWorkUnitId = (text: string) => {
  if (text.includes('교지') || text.includes('교사관리')) return 'education-facility-status';
  if (text.includes('임대시설') || text.includes('대관')) return 'rental-fee-billing';
  if (text.includes('기술지원')) return 'lab-equipment-maintenance';
  if (text.includes('연구실') || text.includes('안전관리')) return 'laboratory-safety';
  if (text.includes('소방')) return 'fire-safety';
  if (text.includes('전기') || text.includes('배전') || text.includes('차단기')) return 'electric-safety';
  if (text.includes('기자재') || text.includes('멀티미디어') || text.includes('케이블')) return 'lab-equipment-maintenance';
  if (text.includes('자산') || text.includes('비품') || text.includes('물품')) return 'campus-asset-work';
  if (text.includes('공사') || text.includes('환경개선') || text.includes('방수')) return 'environment-improvement';
  if (text.includes('조경') || text.includes('배수')) return 'landscape-management';
  return 'facility-maintenance';
};

const resolveUnit = (unitId: string): WorkUnitDefinition =>
  getWorkUnitById(unitId) ?? fallbackUnit;

const buildEntry = (
  base: Omit<WorkLedgerEntry, 'category' | 'unitName' | 'annualHours'>,
): WorkLedgerEntry => {
  const unit = resolveUnit(base.unitId);
  return {
    ...base,
    category: unit.category,
    unitName: unit.name,
    annualHours: unit.annualHours,
  };
};

const taskToEntry = (task: Task): WorkLedgerEntry =>
  buildEntry({
    id: `task-${task.id}`,
    source: '업무 지정',
    sourceId: task.id,
    date: task.completedAt || task.createdAt,
    title: task.title,
    unitId: pickWorkUnitId(`${task.title} ${task.category} ${task.description} ${task.location}`),
    status: getTaskStatusLabel(task),
    description: [
      `업무내용: ${task.description || '미작성'}`,
      `결과: ${task.completionReport || '미작성'}`,
      task.completionRemarks ? `비고: ${task.completionRemarks}` : '',
    ].filter(Boolean).join('\n'),
    evidence: task.completionPhotoUrl || task.photoUrl || '업무지정 이력',
    facilityName: task.location,
    location: task.location,
    assignee: task.assignee,
    createdAt: task.createdAt,
  });

const formatLogFeedback = (log: DailyLog) => {
  if (log.managerFeedbackList.length === 0) return '팀장 피드백 없음';
  return `팀장 피드백: ${log.managerFeedbackList
    .map((feedback) => `${feedback.senderName} - ${feedback.content}`)
    .join(' / ')}`;
};

const dailyLogToEntry = (log: DailyLog): WorkLedgerEntry => {
  const workType = log.workType || DEFAULT_DAILY_LOG_WORK_TYPE;

  return buildEntry({
    id: `daily-log-${log.id}`,
    source: '담당자 자율 등록',
    sourceId: log.id,
    date: log.eveningSubmittedAt || log.morningSubmittedAt || `${log.date}T00:00:00`,
    title: `${log.employeeName} ${workType} 근무일지`,
    unitId: pickWorkUnitId(`${workType} ${log.morningPlan} ${log.eveningResult} ${log.remarks || ''}`),
    status: log.eveningResult ? log.eveningStatus : '오늘 할 일 작성',
    description: [
      `업무구분: ${workType}`,
      `오늘 할 일: ${log.morningPlan || '미작성'}`,
      `결과: ${log.eveningResult || '미작성'}`,
      log.remarks ? `비고: ${log.remarks}` : '',
      formatLogFeedback(log),
    ].filter(Boolean).join('\n'),
    evidence: '담당자 자율 등록 기록',
    assignee: log.employeeName,
    createdAt: log.morningSubmittedAt || log.eveningSubmittedAt || `${log.date}T00:00:00`,
  });
};

const inspectionCycleLabel = {
  weekly: '주간',
  monthly: '월간',
  quarterly: '분기',
  yearly: '연간',
};

const inspectionToEntry = (schedule: FacilityInspectionSchedule): WorkLedgerEntry =>
  buildEntry({
    id: `inspection-${schedule.id}`,
    source: '점검일정',
    sourceId: schedule.id,
    date: schedule.completedAt || schedule.updatedAt || schedule.dueDate,
    title: schedule.title,
    unitId: pickWorkUnitId(`${schedule.facilityName} ${schedule.title} ${schedule.inspectionType} ${schedule.notes || ''}`),
    status: '완료',
    description: [
      `점검유형: ${schedule.inspectionType}`,
      `점검주기: ${inspectionCycleLabel[schedule.cycle]}`,
      `점검예정일: ${schedule.dueDate}`,
      schedule.completedAt ? `완료일시: ${schedule.completedAt}` : '',
      schedule.notes ? `메모: ${schedule.notes}` : '',
    ].filter(Boolean).join('\n'),
    evidence: '점검일정 이력',
    facilityName: schedule.facilityName,
    location: schedule.facilityName,
    assignee: schedule.inspectorName,
    createdAt: schedule.createdAt,
  });

export const buildWorkLedgerEntries = (sources: WorkLedgerSources): WorkLedgerEntry[] =>
  [
    ...sources.tasks.map(taskToEntry),
    ...sources.dailyLogs.map(dailyLogToEntry),
    ...(sources.inspectionSchedules ?? [])
      .filter((schedule) => schedule.status === 'completed')
      .map(inspectionToEntry),
  ].sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime());
