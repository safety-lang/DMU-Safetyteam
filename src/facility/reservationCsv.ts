import { RESERVATION_STATUS_LABEL } from './reservationDisplay';
import type { FacilityReservation } from './types';

const CSV_HEADERS = ['상태', '일정구분', '제목', '시작일시', '완료/종료 예정일시', '요청기관/관련부서', '등록자', '시설/위치', '내용', '등록일', '수정일'];

const escapeCsvCell = (value: string | number) =>
  `"${String(value).replace(/"/g, '""')}"`;

const sortByStartAt = (reservations: FacilityReservation[]) =>
  [...reservations].sort((first, second) =>
    new Date(first.startAt).getTime() - new Date(second.startAt).getTime()
  );

export const buildUsageScheduleCsv = (reservations: FacilityReservation[]) => {
  const rows = sortByStartAt(reservations).map((reservation) => [
    RESERVATION_STATUS_LABEL[reservation.status],
    reservation.scheduleKind || '대관',
    reservation.title || reservation.facilityName,
    new Date(reservation.startAt).toLocaleString('ko-KR'),
    new Date(reservation.endAt).toLocaleString('ko-KR'),
    reservation.requesterOrganization || '',
    reservation.requesterName,
    reservation.location || reservation.facilityName || '',
    reservation.purpose,
    new Date(reservation.createdAt).toLocaleString('ko-KR'),
    new Date(reservation.updatedAt).toLocaleString('ko-KR'),
  ]);

  return [CSV_HEADERS, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n');
};
