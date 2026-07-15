import { Task } from '../types';

export const isCompletionApproved = (task: Task) =>
  task.history.some((log) => log.action.includes('최종 통과'));

export const isApprovalPending = (task: Task) =>
  task.status === '완료' && Boolean(task.completionReport) && !isCompletionApproved(task);

export const getTaskDelayDeadline = (task: Task) => {
  if (!task.dueDate) return null;
  const deadline = new Date(task.dueDate).getTime();
  return Number.isNaN(deadline) ? null : deadline;
};

export const isTaskDelayed = (task: Task, now = Date.now()) => {
  const deadline = getTaskDelayDeadline(task);
  return task.status !== '완료' && deadline !== null && deadline < now;
};

export const getTaskStatusLabel = (task: Task) => {
  if (isTaskDelayed(task)) return '지연';
  if (task.status === '완료') return '완료';
  if (task.status === '진행중') return '진행중';
  return '접수대기';
};
