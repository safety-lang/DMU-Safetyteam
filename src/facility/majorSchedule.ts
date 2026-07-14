import type { DailyLog, Task } from '../types';
import type { FacilityReservation, ReservationStatus } from './types';

export type MajorScheduleSource = '업무지정' | '자기관리 업무' | '주요 일정';
export type MajorScheduleStatus = '예정' | '진행' | '완료' | '지연' | '취소';

export interface MajorScheduleItem {
  id: string;
  source: MajorScheduleSource;
  category: string;
  title: string;
  assignee: string;
  location: string;
  startAt: string;
  dueAt: string;
  status: MajorScheduleStatus;
  content: string;
}

const toTime = (value?: string) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const isPast = (value?: string, now = new Date()) => {
  const time = toTime(value);
  return time > 0 && time < now.getTime();
};

export const formatMajorScheduleDateTime = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}. ${month}. ${day}. ${hour}:${minute}`;
};

export const getReservationDisplayStatus = (
  reservation: FacilityReservation,
  now = new Date(),
): MajorScheduleStatus => {
  if (reservation.status === 'cancelled') return '취소';
  if (reservation.status === 'completed') return '완료';
  if (isPast(reservation.endAt, now)) return '지연';
  if (reservation.status === 'in_progress' || reservation.status === 'approved') return '진행';
  return '예정';
};

export const getReservationStatusLabel = (status: ReservationStatus) => {
  if (status === 'completed') return '완료';
  if (status === 'in_progress' || status === 'approved') return '진행';
  if (status === 'cancelled') return '취소';
  return '예정';
};

const getTaskScheduleStatus = (task: Task, now = new Date()): MajorScheduleStatus => {
  if (task.status === '완료') return '완료';
  if (isPast(task.dueDate, now)) return '지연';
  if (task.status === '진행중') return '진행';
  return '예정';
};

const getDailyLogScheduleStatus = (log: DailyLog, now = new Date()): MajorScheduleStatus => {
  if (log.eveningStatus === '완료') return '완료';
  const dueAt = `${log.date}T23:59:59`;
  if (isPast(dueAt, now)) return '지연';
  if (log.eveningStatus === '진행중') return '진행';
  return '예정';
};

const reservationToScheduleItem = (
  reservation: FacilityReservation,
  now: Date,
): MajorScheduleItem => ({
  id: `reservation:${reservation.id}`,
  source: '주요 일정',
  category: reservation.scheduleKind || '대관',
  title: reservation.title || reservation.facilityName || '주요 일정',
  assignee: reservation.requesterName,
  location: reservation.location || reservation.facilityName || '-',
  startAt: reservation.startAt,
  dueAt: reservation.endAt,
  status: getReservationDisplayStatus(reservation, now),
  content: reservation.purpose,
});

const taskToScheduleItem = (task: Task, now: Date): MajorScheduleItem => ({
  id: `task:${task.id}`,
  source: '업무지정',
  category: task.category || '업무지정',
  title: task.title,
  assignee: task.assignee || '-',
  location: task.location || '-',
  startAt: task.createdAt,
  dueAt: task.dueDate || task.completedAt || task.createdAt,
  status: getTaskScheduleStatus(task, now),
  content: task.completionReport
    ? `${task.description}\n\n결과: ${task.completionReport}`
    : task.description,
});

const dailyLogToScheduleItem = (log: DailyLog, now: Date): MajorScheduleItem => ({
  id: `daily:${log.id}`,
  source: '자기관리 업무',
  category: log.workType || '자기관리 업무',
  title: log.workTitle || `${log.employeeName} 업무기록`,
  assignee: log.employeeName,
  location: log.workLocation || '-',
  startAt: log.morningSubmittedAt || `${log.date}T00:00:00`,
  dueAt: log.eveningSubmittedAt || `${log.date}T23:59:59`,
  status: getDailyLogScheduleStatus(log, now),
  content: log.eveningResult
    ? `오늘 할 일: ${log.morningPlan}\n결과: ${log.eveningResult}${log.remarks ? `\n비고: ${log.remarks}` : ''}`
    : `오늘 할 일: ${log.morningPlan}`,
});

export const buildMajorScheduleItems = (
  reservations: FacilityReservation[],
  tasks: Task[],
  dailyLogs: DailyLog[],
  now = new Date(),
) => [
  ...reservations.map((reservation) => reservationToScheduleItem(reservation, now)),
  ...tasks.map((task) => taskToScheduleItem(task, now)),
  ...dailyLogs.map((log) => dailyLogToScheduleItem(log, now)),
].sort((first, second) => toTime(first.dueAt || first.startAt) - toTime(second.dueAt || second.startAt));
