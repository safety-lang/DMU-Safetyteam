import {
  buildCompletedWorkCsv,
  buildCompletedWorkRecords,
  formatAdminRecordDateTime,
} from './adminCompletionRecords';
import type { FacilityAppState } from '../types';

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const snapshot: FacilityAppState = {
  app: 'DMU_FACILITY_MANAGEMENT',
  version: 1,
  exportedAt: '2026-05-28T00:00:00.000Z',
  tasks: [
    {
      id: 'done-task',
      title: '완료 업무',
      category: '전기',
      description: '업무 설명',
      status: '완료',
      priority: '보통',
      location: '본관',
      assignee: '김영해',
      createdAt: '2026-05-27T00:00:00.000Z',
      completedAt: '2026-05-27T03:00:00.000Z',
      completionReport: '완료 보고',
      completionRemarks: '검토사항: 차단기 예비품 확보 필요',
      comments: [],
      history: [],
    },
    {
      id: 'open-task',
      title: '대기 업무',
      category: '전기',
      description: '대기 설명',
      status: '대기중',
      priority: '보통',
      location: '본관',
      assignee: '김영해',
      createdAt: '2026-05-27T00:00:00.000Z',
      comments: [],
      history: [],
    },
  ],
  notifications: [],
  dailyLogs: [
    {
      id: 'done-log',
      date: '2026-05-27',
      employeeId: 'user-kim',
      employeeName: '김영해',
      employeeRole: '계장',
      workType: '안전관리',
      workTitle: '연구실 안전점검',
      workLocation: '공학관 공용 실험실',
      morningPlan: '점검',
      morningSubmittedAt: '2026-05-27T00:30:00.000Z',
      eveningResult: '점검 완료',
      remarks: '개선사항: 점검표 양식 보완 필요',
      eveningStatus: '완료',
      eveningSubmittedAt: '2026-05-27T08:30:00.000Z',
      managerFeedbackList: [],
    },
    {
      id: 'open-log',
      date: '2026-05-27',
      employeeId: 'user-park',
      employeeName: '박희찬',
      employeeRole: '과장',
      morningPlan: '확인',
      eveningResult: '',
      eveningStatus: '진행중',
      managerFeedbackList: [],
    },
  ],
  syncedTaskIds: [],
  calendarWebAppUrl: '',
  calendarWebhookSecret: '',
  soundEnabled: false,
};

const records = buildCompletedWorkRecords(snapshot);

assert(records.length === 2, 'only completed task and completed daily log should be included');
assert(records.some((record) => record.origin === '업무 지정'), 'completed task should use 업무 지정 origin');
assert(records.some((record) => record.origin === '담당자 자율 등록'), 'completed daily log should use self-managed origin');
assert(records.some((record) => record.workType === '안전관리'), 'daily log work type should be used as 업무구분');
assert(records.some((record) => record.title === '연구실 안전점검'), 'daily log work title should be used');
assert(records.some((record) => record.location === '공학관 공용 실험실'), 'daily log location should be kept');
assert(records.some((record) => record.detail.includes('비고: 검토사항')), 'task completion remarks should be included');
assert(records.some((record) => record.detail.includes('비고: 개선사항')), 'daily log remarks should be included');
assert(!records.some((record) => record.title.includes('대기 업무')), 'open task should be excluded');

const csv = buildCompletedWorkCsv(records);

assert(csv.startsWith('"출발점","업무구분","시작일시","완료일시","제목","담당자","시설/위치","업무내용"'), 'csv should use completion list headers');
assert(formatAdminRecordDateTime('2026-05-27T03:04:05') === '2026. 5. 27. 03:04', 'date time should use 24-hour minute format');
assert(!csv.includes('오전') && !csv.includes('오후'), 'csv should not include AM/PM labels');
assert(csv.includes('"완료 업무"'), 'csv should include completed task title');
assert(!csv.includes('"대기 업무"'), 'csv should exclude open task title');

console.log('admin completion record tests passed');
