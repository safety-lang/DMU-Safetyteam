import { buildWorkLedgerEntries } from './workLedger';
import { buildWorkLedgerCsv } from './workLedgerCsv';
import type { DailyLog, Task } from '../types';
import type { FacilityInspectionSchedule } from './types';

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const tasks: Task[] = [
  {
    id: 'task_1',
    title: '연구실 안전관리 점검',
    category: '안전관리(연구실 안전포함)',
    description: '화학물질 보관함 점검',
    status: '완료',
    priority: '긴급',
    location: '8호관 연구실',
    assignee: '박성훈',
    createdAt: '2026-05-20T09:00:00Z',
    completedAt: '2026-05-21T09:00:00Z',
    completionReport: '보관함 점검 완료',
    completionRemarks: '유의사항: MSDS 최신본 비치 필요',
    comments: [],
    history: [],
  },
];

const dailyLogs: DailyLog[] = [
  {
    id: 'log_1',
    date: '2026-05-23',
    employeeId: 'user_lee',
    employeeName: '이인혁',
    employeeRole: '과장',
    workTitle: '전기 기계동 릴레이 점검',
    workLocation: '전기 기계동 전력 제어반',
    morningPlan: '전기 기계동 전력 제어반 3호 릴레이 점검',
    morningSubmittedAt: '2026-05-23T08:10:00Z',
    eveningResult: '릴레이 2개 교체 완료 및 전압 확인',
    remarks: '검토사항: 예비 릴레이 재고 보충 필요',
    eveningStatus: '완료',
    eveningSubmittedAt: '2026-05-23T17:40:00Z',
    managerFeedbackList: [
      {
        id: 'feedback_1',
        senderName: '나형석',
        senderRole: '팀장',
        content: '점검 이력 전산 대장 확인',
        timestamp: '2026-05-23T18:00:00Z',
      },
    ],
  },
];

const inspectionSchedules: FacilityInspectionSchedule[] = [
  {
    id: 'inspection_1',
    facilityId: 'facility_1',
    facilityName: '본관',
    title: '본관 소방설비 월간 점검',
    inspectionType: '소방',
    cycle: 'monthly',
    inspectorName: '오승훈',
    dueDate: '2026-05-24',
    status: 'completed',
    notes: '소화전 압력 확인',
    completedAt: '2026-05-24T12:00:00Z',
    createdAt: '2026-05-20T09:00:00Z',
    updatedAt: '2026-05-24T12:00:00Z',
  },
  {
    id: 'inspection_2',
    facilityId: 'facility_2',
    facilityName: '공학관',
    title: '공학관 전기 점검',
    inspectionType: '전기',
    cycle: 'monthly',
    inspectorName: '이인혁',
    dueDate: '2026-05-30',
    status: 'scheduled',
    createdAt: '2026-05-20T09:00:00Z',
    updatedAt: '2026-05-20T09:00:00Z',
  },
];

const entries = buildWorkLedgerEntries({
  tasks,
  dailyLogs,
  inspectionSchedules,
});

assert(entries.length === 3, 'ledger should include task, self-managed work log, and completed inspection records');
assert(entries.some((entry) => entry.source === '업무 지정'), 'task should create assignment origin entry');
assert(entries.some((entry) => entry.source === '담당자 자율 등록'), 'daily log should create self-managed origin entry');
assert(entries.some((entry) => entry.source === '점검일정'), 'completed inspection should create inspection entry');
assert(!entries.some((entry) => entry.sourceId === 'inspection_2'), 'scheduled inspection should not appear in ledger');
assert(entries.some((entry) => entry.description.includes('비고: 유의사항')), 'task entry should include completion remarks');
assert(entries.some((entry) => entry.title === '전기 기계동 릴레이 점검'), 'daily log entry should use structured work title');
assert(entries.some((entry) => entry.location === '전기 기계동 전력 제어반'), 'daily log entry should keep structured work location');
assert(entries.some((entry) => entry.description.includes('업무내용')), 'daily log entry should summarize work detail text');
assert(entries.some((entry) => entry.description.includes('비고: 검토사항')), 'daily log entry should include remarks');
assert(entries.some((entry) => entry.description.includes('팀장 피드백')), 'daily log entry should include manager feedback');
assert(entries.some((entry) => entry.description.includes('점검유형: 소방')), 'inspection entry should include inspection type');

const csv = buildWorkLedgerCsv(entries);

assert(csv.startsWith('"발생일","출발점","업무분류"'), 'csv should include Korean headers');
const removedWorkflowColumn = ['P', 'D', 'C', 'A'].join('');
assert(!csv.includes(removedWorkflowColumn), 'csv should not include removed workflow column');
assert(csv.includes('"담당자 자율 등록"'), 'csv should include self-managed origin label');
assert(csv.includes('"업무 지정"'), 'csv should include assignment origin label');
assert(csv.includes('"점검일정"'), 'csv should include inspection source label');
assert(csv.includes('"연구실안전관리"'), 'csv should include unit name');

console.log('work ledger tests passed');
