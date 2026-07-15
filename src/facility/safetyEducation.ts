export interface SafetyEducationRecord {
  id: string;
  category: string;
  manager: string;
  trainingType: '선임교육' | '정기교육';
  cycle: string;
  completionStatus: string;
  nextEducationDate: string;
  nextEducationNote: string;
}

export interface SafetyEducationReminder {
  recordId: string;
  category: string;
  manager: string;
  trainingType: string;
  monthsBefore: number;
  reminderDate: string;
  nextEducationDate: string;
  status: '예정' | '알림기간' | '지연';
}

export const SAFETY_EDUCATION_STORAGE_KEY = 'facility_safety_education_records_v1';

export const SAFETY_EDUCATION_REMINDER_MONTHS = [6, 5, 4, 3, 2, 1];

export const DEFAULT_SAFETY_EDUCATION_RECORDS: SafetyEducationRecord[] = [
  {
    id: 'fire-na-appointment',
    category: '소방 안전관리자',
    manager: '나형석',
    trainingType: '선임교육',
    cycle: '최초 선임 후 6개월 이내 / 선임신고 2024.04.09.',
    completionStatus: '2024.04.15.~19.',
    nextEducationDate: '2028-04-10',
    nextEducationNote: '2028.04.10. 이전',
  },
  {
    id: 'fire-na-regular',
    category: '소방 안전관리자',
    manager: '나형석',
    trainingType: '정기교육',
    cycle: '2년 1회',
    completionStatus: '2026.04.10.',
    nextEducationDate: '2028-04-10',
    nextEducationNote: '2028.04.10. 이전',
  },
  {
    id: 'electric-lee-appointment',
    category: '전기 안전관리자',
    manager: '이인혁',
    trainingType: '선임교육',
    cycle: '최초 선임 후 6개월 이내',
    completionStatus: '2023. 5. 9.',
    nextEducationDate: '2029-03-13',
    nextEducationNote: '2029. 3.13. 이전',
  },
  {
    id: 'electric-lee-regular',
    category: '전기 안전관리자',
    manager: '이인혁',
    trainingType: '정기교육',
    cycle: '3년 1회',
    completionStatus: '2026. 3.13.',
    nextEducationDate: '2029-03-13',
    nextEducationNote: '2029. 3.13. 이전',
  },
  {
    id: 'electric-park-appointment',
    category: '전기 안전관리자',
    manager: '박희찬',
    trainingType: '선임교육',
    cycle: '최초 선임 후 6개월 이내',
    completionStatus: '2017.06.30.',
    nextEducationDate: '2028-07-11',
    nextEducationNote: '2028.07.11. 이전',
  },
  {
    id: 'electric-park-regular',
    category: '전기 안전관리자',
    manager: '박희찬',
    trainingType: '정기교육',
    cycle: '3년 1회',
    completionStatus: '2025.07.11.',
    nextEducationDate: '2028-07-11',
    nextEducationNote: '2028.07.11. 이전',
  },
  {
    id: 'gas-kim-appointment',
    category: '가스 안전관리자',
    manager: '김익현',
    trainingType: '선임교육',
    cycle: '최초 선임 후 6개월 이내',
    completionStatus: '2020.06.24.',
    nextEducationDate: '',
    nextEducationNote: '2028.00.00. 이전',
  },
  {
    id: 'gas-kim-regular',
    category: '가스 안전관리자',
    manager: '김익현',
    trainingType: '정기교육',
    cycle: '3년 1회',
    completionStatus: '2025.00.00.',
    nextEducationDate: '',
    nextEducationNote: '2028.00.00. 이전',
  },
  {
    id: 'environment-park-appointment',
    category: '환경 위생관리자',
    manager: '박희찬',
    trainingType: '선임교육',
    cycle: '최초 선임 후 3개월 이내',
    completionStatus: '',
    nextEducationDate: '',
    nextEducationNote: '2027.00.00. 이전',
  },
  {
    id: 'environment-park-regular',
    category: '환경 위생관리자',
    manager: '박희찬',
    trainingType: '정기교육',
    cycle: '3년 1회',
    completionStatus: '',
    nextEducationDate: '',
    nextEducationNote: '2027.00.00. 이전',
  },
  {
    id: 'elevator-kim-appointment',
    category: '승강기 안전관리자',
    manager: '김익현',
    trainingType: '선임교육',
    cycle: '최초 선임 후 3개월 이내',
    completionStatus: '',
    nextEducationDate: '2029-06-22',
    nextEducationNote: '2029.06.22. 이전',
  },
  {
    id: 'elevator-kim-regular',
    category: '승강기 안전관리자',
    manager: '김익현',
    trainingType: '정기교육',
    cycle: '3년 1회',
    completionStatus: '2026.04.10.',
    nextEducationDate: '2029-06-22',
    nextEducationNote: '2029.06.22. 이전',
  },
  {
    id: 'lab-jang-appointment',
    category: '연구실 안전관리자',
    manager: '장민석',
    trainingType: '선임교육',
    cycle: '최초 선임 후 6개월 이내',
    completionStatus: '2025. 1. 15.',
    nextEducationDate: '2027-01-14',
    nextEducationNote: '2027. 1. 14 이전',
  },
  {
    id: 'lab-jang-regular',
    category: '연구실 안전관리자',
    manager: '장민석',
    trainingType: '정기교육',
    cycle: '신규교육 후 2년 전후 6개월 이내',
    completionStatus: '-',
    nextEducationDate: '2027-01-14',
    nextEducationNote: '2027. 1. 14 이전',
  },
  {
    id: 'lab-park-appointment',
    category: '연구실 안전관리자',
    manager: '박희찬',
    trainingType: '선임교육',
    cycle: '최초 선임 후 6개월 이내',
    completionStatus: '2020.01.15.',
    nextEducationDate: '2026-05-30',
    nextEducationNote: '2026.05.30. 이전',
  },
  {
    id: 'lab-park-regular',
    category: '연구실 안전관리자',
    manager: '박희찬',
    trainingType: '정기교육',
    cycle: '신규교육 후 2년 전후 6개월 이내',
    completionStatus: '2024.05.31.',
    nextEducationDate: '2026-05-30',
    nextEducationNote: '2026.05.30. 이전',
  },
  {
    id: 'lab-na-appointment',
    category: '연구실 안전관리자',
    manager: '나형석',
    trainingType: '선임교육',
    cycle: '최초 선임 후 6개월 이내',
    completionStatus: '2026.05.27. 지정',
    nextEducationDate: '2026-11-26',
    nextEducationNote: '2026.11.26 이전',
  },
  {
    id: 'lab-na-regular',
    category: '연구실 안전관리자',
    manager: '나형석',
    trainingType: '정기교육',
    cycle: '신규교육 후 2년 전후 6개월 이내',
    completionStatus: '',
    nextEducationDate: '2026-11-26',
    nextEducationNote: '2026.11.26 이전',
  },
];

export const formatDateInputValue = (value: string) => {
  if (!value) return '-';
  const [year, month, day] = value.split('-');
  return `${year}.${month}.${day}. 이전`;
};

export const hasCompletedAppointmentTraining = (record: SafetyEducationRecord) =>
  record.trainingType === '선임교육' &&
  Boolean(record.completionStatus.trim()) &&
  record.completionStatus.trim() !== '-';

const toDate = (value: string) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const subtractMonths = (value: string, months: number) => {
  const date = toDate(value);
  if (!date) return '';
  date.setMonth(date.getMonth() - months);
  return toDateInput(date);
};

const compareDateOnly = (first: string, second: string) =>
  first.localeCompare(second);

export const getEducationDueStatus = (
  record: SafetyEducationRecord,
  today = toDateInput(new Date()),
) => {
  if (hasCompletedAppointmentTraining(record)) return '완료';
  if (!record.nextEducationDate) return '일정 입력 필요';
  if (compareDateOnly(record.nextEducationDate, today) < 0) return '지연';
  const firstReminder = subtractMonths(record.nextEducationDate, 6);
  if (firstReminder && compareDateOnly(firstReminder, today) <= 0) return '알림기간';
  return '예정';
};

export const buildSafetyEducationReminders = (
  records: SafetyEducationRecord[],
  today = toDateInput(new Date()),
): SafetyEducationReminder[] =>
  records.flatMap((record) => {
    if (hasCompletedAppointmentTraining(record)) return [];
    if (!record.nextEducationDate) return [];

    return SAFETY_EDUCATION_REMINDER_MONTHS.map((monthsBefore) => {
      const reminderDate = subtractMonths(record.nextEducationDate, monthsBefore);
      const duePassed = compareDateOnly(record.nextEducationDate, today) < 0;
      const active = compareDateOnly(reminderDate, today) <= 0 && !duePassed;

      return {
        recordId: record.id,
        category: record.category,
        manager: record.manager,
        trainingType: record.trainingType,
        monthsBefore,
        reminderDate,
        nextEducationDate: record.nextEducationDate,
        status: duePassed ? '지연' : active ? '알림기간' : '예정',
      };
    });
  });
