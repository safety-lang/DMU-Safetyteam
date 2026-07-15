import type { DailyLog, FacilityAppState, Task } from '../types';
import { DEFAULT_DAILY_LOG_WORK_TYPE } from './dailyLogWorkTypes';

export interface CompletedWorkRecord {
  id: string;
  origin: '업무 지정' | '담당자 자율 등록';
  workType: string;
  startedAt?: string;
  completedAt?: string;
  title: string;
  owner?: string;
  location?: string;
  detail?: string;
}

const escapeCsvCell = (value: string | number | undefined) =>
  `"${String(value ?? '').replace(/"/g, '""')}"`;

const toTime = (value?: string) => {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

export const formatAdminRecordDateTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}. ${hours}:${minutes}`;
};

export const isCompletedTaskRecord = (task: Task) => task.status === '완료';

export const isCompletedDailyLogRecord = (log: DailyLog) =>
  log.eveningStatus === '완료' && Boolean(log.eveningResult.trim());

export const buildCompletedWorkRecords = (snapshot: FacilityAppState): CompletedWorkRecord[] => {
  const taskRecords: CompletedWorkRecord[] = snapshot.tasks
    .filter(isCompletedTaskRecord)
    .map((task) => ({
      id: `task-${task.id}`,
      origin: '업무 지정',
      workType: task.category || '업무 지정',
      startedAt: task.createdAt,
      completedAt: task.completedAt || task.createdAt,
      title: task.title,
      owner: task.assignee,
      location: task.location,
      detail: [
        `업무내용: ${task.description || '-'}`,
        `결과: ${task.completionReport || '-'}`,
        task.completionRemarks ? `비고: ${task.completionRemarks}` : '',
      ].filter(Boolean).join('\n'),
    }));

  const dailyLogRecords: CompletedWorkRecord[] = snapshot.dailyLogs
    .filter(isCompletedDailyLogRecord)
    .map((log) => ({
      id: `daily-${log.id}`,
      origin: '담당자 자율 등록',
      workType: log.workType || DEFAULT_DAILY_LOG_WORK_TYPE,
      startedAt: log.morningSubmittedAt || `${log.date}T00:00:00`,
      completedAt: log.eveningSubmittedAt || `${log.date}T23:59:59`,
      title: log.workTitle || `${log.employeeName} 근무일지`,
      owner: log.employeeName,
      location: log.workLocation,
      detail: [
        `업무내용: ${log.morningPlan || '-'}`,
        `결과: ${log.eveningResult}`,
        log.remarks ? `비고: ${log.remarks}` : '',
      ].filter(Boolean).join('\n'),
    }));

  return [...taskRecords, ...dailyLogRecords].sort(
    (first, second) => toTime(second.completedAt) - toTime(first.completedAt),
  );
};

export const buildCompletedWorkCsv = (records: CompletedWorkRecord[]) => {
  const headers = ['출발점', '업무분류', '시작일시', '완료일시', '제목', '담당자', '시설/위치', '업무내용'];
  const rows = records.map((record) => [
    record.origin,
    record.workType,
    formatAdminRecordDateTime(record.startedAt),
    formatAdminRecordDateTime(record.completedAt),
    record.title,
    record.owner,
    record.location,
    record.detail,
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n');
};

