import type { WorkLedgerEntry } from './types';

const CSV_HEADERS = [
  '발생일',
  '출발점',
  '업무분류',
  '단위업무',
  '제목',
  '상태',
  '담당자',
  '시설/위치',
  '기준 업무량',
  '증빙',
  '내용',
];

const escapeCsvCell = (value: string | number | undefined) =>
  `"${String(value ?? '').replace(/"/g, '""')}"`;

const formatDate = (value: string) => new Date(value).toLocaleString('ko-KR');

export const buildWorkLedgerCsv = (entries: WorkLedgerEntry[]) => {
  const rows = entries.map((entry) => [
    formatDate(entry.date),
    entry.source,
    entry.category,
    entry.unitName,
    entry.title,
    entry.status,
    entry.assignee,
    entry.facilityName || entry.location,
    entry.annualHours ? `${entry.annualHours}시간` : '',
    entry.evidence,
    entry.description,
  ]);

  return [CSV_HEADERS, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n');
};
