import { buildCalendarWebhookPayload, isAppsScriptWebAppUrl } from './googleCalendar';
import type { Task } from '../types';

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const task: Task = {
  id: 'task-google-due',
  title: '전기실 분전반 점검',
  category: '시설관리',
  description: '분전반 이상 여부 확인',
  status: '대기중',
  priority: '보통',
  location: '본관 전기실',
  assignee: '이인혁',
  createdAt: '2026-07-07T01:00:00.000Z',
  dueDate: '2026-07-30T08:00:00.000Z',
  comments: [],
  history: [],
};

const payload = buildCalendarWebhookPayload(task, 'secret-key');

assert(payload.secret === 'secret-key', 'webhook secret should be included');
assert(payload.task.dueDate === task.dueDate, 'task due date should be sent to Apps Script');
assert(payload.task.title === task.title, 'task title should be preserved');
assert(
  isAppsScriptWebAppUrl('https://script.google.com/macros/s/AKfycbx-example/exec'),
  'standard Apps Script web app URL should be accepted'
);
assert(
  isAppsScriptWebAppUrl('https://script.google.com/a/macros/dongyang.ac.kr/s/AKfycbx-example/exec'),
  'Google Workspace Apps Script web app URL should be accepted'
);
assert(
  isAppsScriptWebAppUrl('https://script.google.com/a/macros/dongyang.ac.kr/s/AKfycbx-example/exec?authuser=0'),
  'Google Workspace Apps Script web app URL with query should be accepted'
);
assert(
  !isAppsScriptWebAppUrl('https://script.google.com/macros/s/AKfycbx-example/dev'),
  'development Apps Script URL should be rejected'
);

console.log('google calendar payload tests passed');
