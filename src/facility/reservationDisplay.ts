import type { ReservationStatus } from './types';

export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  pending: '예정',
  approved: '진행',
  rejected: '예정',
  in_progress: '진행',
  completed: '완료',
  cancelled: '취소',
};

export const formatReservationDateTime = (value: string) =>
  new Date(value).toLocaleString('ko-KR');
