import { buildUsageScheduleCsv } from './reservationCsv';
import type { FacilityReservation } from './types';

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const reservations: FacilityReservation[] = [
  {
    id: 'reservation_late',
    facilityId: 'facility_2',
    facilityName: '본관 회의실',
    scheduleKind: '행사',
    title: '외부기관 행사',
    location: '본관 회의실',
    requesterId: 'admin_1',
    requesterName: '시설관리팀',
    requesterRole: 'admin',
    requesterOrganization: '외부기관',
    purpose: '취소된 일정',
    startAt: '2026-06-02T10:00',
    endAt: '2026-06-02T11:00',
    status: 'cancelled',
    createdAt: '2026-05-27T09:00:00Z',
    updatedAt: '2026-05-27T09:00:00Z',
  },
  {
    id: 'reservation_early',
    facilityId: 'facility_1',
    facilityName: '스마트 강의실',
    scheduleKind: '대관',
    title: '건축학과 대관',
    location: '스마트 강의실',
    requesterId: 'admin_1',
    requesterName: '시설관리팀',
    requesterRole: 'admin',
    requesterOrganization: '건축학과',
    purpose: '학과 행사, 연락처 1234',
    startAt: '2026-06-01T10:00',
    endAt: '2026-06-01T12:00',
    status: 'in_progress',
    createdAt: '2026-05-27T09:00:00Z',
    updatedAt: '2026-05-27T09:00:00Z',
  },
];

const csv = buildUsageScheduleCsv(reservations);

assert(csv.startsWith('"상태","일정구분","제목"'), 'csv should include major schedule headers');
assert(csv.indexOf('스마트 강의실') < csv.indexOf('본관 회의실'), 'csv should sort by start time');
assert(csv.includes('"진행"'), 'csv should use major schedule status labels');
assert(csv.includes('"건축학과"'), 'csv should include requester organization');
assert(csv.includes('"학과 행사, 연락처 1234"'), 'csv should escape comma-containing details');

console.log('reservation csv tests passed');
