import {
  buildSafetyEducationReminders,
  getEducationDueStatus,
  type SafetyEducationRecord,
} from './safetyEducation';

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const completedAppointment: SafetyEducationRecord = {
  id: 'appointment_done',
  category: '소방 안전관리자',
  manager: '나형석',
  trainingType: '선임교육',
  cycle: '최초 선임 후 6개월 이내',
  completionStatus: '2024.04.15.~19.',
  nextEducationDate: '2026-02-01',
  nextEducationNote: '2026.02.01. 이전',
};

const pendingAppointment: SafetyEducationRecord = {
  ...completedAppointment,
  id: 'appointment_pending',
  completionStatus: '',
};

const regularTraining: SafetyEducationRecord = {
  ...completedAppointment,
  id: 'regular_training',
  trainingType: '정기교육',
  completionStatus: '2025.02.01.',
};

assert(
  getEducationDueStatus(completedAppointment, '2026-01-01') === '완료',
  'completed appointment training should stay completed',
);

assert(
  buildSafetyEducationReminders([completedAppointment], '2026-01-01').length === 0,
  'completed appointment training should not create reminders',
);

assert(
  getEducationDueStatus(pendingAppointment, '2026-01-01') === '알림기간',
  'pending appointment training should still create reminder state',
);

assert(
  buildSafetyEducationReminders([pendingAppointment], '2026-01-01').length === 1,
  'pending appointment training should show only the latest active reminder',
);

assert(
  getEducationDueStatus(regularTraining, '2026-03-01') === '지연',
  'regular training should still be checked by next education date',
);

const overdueReminders = buildSafetyEducationReminders([regularTraining], '2026-03-01');

assert(
  overdueReminders.length === 1 &&
    overdueReminders[0].status === '지연' &&
    overdueReminders[0].monthsBefore === 1,
  'overdue training should show only the final delayed reminder',
);

console.log('safety education tests passed');
