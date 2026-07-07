import { Task } from '../types';

export const FACILITY_SHARED_CALENDAR_ID =
  'c_04b42241eb38f7f266a3bb553557a109b5ec69bdf42888d195c106f7de81f36c@group.calendar.google.com';
export const FACILITY_SHARED_CALENDAR_NAME = '시설관리팀 공유 일정 할 일';

export const SHARED_CALENDAR_WEB_APP_URL_KEY = 'fms_shared_calendar_web_app_url';
export const SHARED_CALENDAR_WEBHOOK_SECRET_KEY = 'fms_shared_calendar_webhook_secret';
export const SHARED_CALENDAR_AUTO_SYNC_KEY = 'fms_shared_calendar_auto_sync';

export interface SharedCalendarSyncResult {
  ok: true;
}

export function buildCalendarWebhookPayload(task: Task, secret?: string) {
  return {
    secret: secret || '',
    calendarId: FACILITY_SHARED_CALENDAR_ID,
    task: {
      id: task.id,
      title: task.title,
      category: task.category,
      description: task.description,
      status: task.status,
      priority: task.priority,
      location: task.location,
      assignee: task.assignee,
      createdAt: task.createdAt,
      dueDate: task.dueDate,
      completedAt: task.completedAt,
      completionReport: task.completionReport,
      completionRemarks: task.completionRemarks,
      comments: task.comments.map((comment) => ({
        senderName: comment.senderName,
        senderRole: comment.senderRole,
        content: comment.content,
        timestamp: comment.timestamp,
      })),
    },
  };
}

export async function syncTaskToGoogleCalendar(
  task: Task,
  webAppUrl: string,
  secret?: string
): Promise<SharedCalendarSyncResult> {
  const targetUrl = webAppUrl.trim();
  if (!targetUrl) {
    throw new Error('Apps Script 웹앱 URL이 설정되어 있지 않습니다.');
  }

  if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/i.test(targetUrl)) {
    throw new Error('Apps Script 배포 URL은 https://script.google.com/macros/s/.../exec 형식이어야 합니다.');
  }

  await fetch(targetUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(buildCalendarWebhookPayload(task, secret)),
  });

  return { ok: true };
}
