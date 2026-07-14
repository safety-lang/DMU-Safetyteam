import {
  Facility,
  FacilityReservation,
  ReservationFormValues,
  ReservationValidationErrors,
} from './types';

const ACTIVE_RESERVATION_STATUSES = ['pending', 'approved', 'in_progress'];

export const EMPTY_RESERVATION_FORM: ReservationFormValues = {
  facilityId: '',
  scheduleKind: '대관',
  title: '',
  location: '',
  requesterOrganization: '',
  purpose: '',
  startAt: '',
  endAt: '',
};

const overlaps = (startAt: string, endAt: string, reservation: FacilityReservation) => {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  const otherStart = new Date(reservation.startAt).getTime();
  const otherEnd = new Date(reservation.endAt).getTime();
  return start < otherEnd && end > otherStart;
};

export const hasReservationConflict = (
  values: ReservationFormValues,
  reservations: FacilityReservation[],
  ignoredReservationId = '',
) => reservations.some((reservation) =>
  Boolean(values.facilityId) &&
  reservation.id !== ignoredReservationId &&
  reservation.facilityId === values.facilityId &&
  ACTIVE_RESERVATION_STATUSES.includes(reservation.status) &&
  overlaps(values.startAt, values.endAt, reservation)
);

export const validateReservationForm = (
  values: ReservationFormValues,
  facilities: Facility[],
  reservations: FacilityReservation[],
  now = new Date(),
  ignoredReservationId = '',
): ReservationValidationErrors => {
  const errors: ReservationValidationErrors = {};
  const start = new Date(values.startAt);
  const end = new Date(values.endAt);
  const facility = facilities.find((item) => item.id === values.facilityId);

  if (!values.title.trim()) errors.title = '일정 제목을 입력하세요.';
  if (values.facilityId && facility?.status !== '운영중') {
    errors.facilityId = '등록 가능한 시설만 선택할 수 있습니다.';
  }
  if (values.scheduleKind === '대관' && !values.requesterOrganization.trim()) {
    errors.requesterOrganization = '대관요청기관을 입력하세요.';
  }
  if (!values.purpose.trim()) errors.purpose = '일정 내용 또는 업무 내용을 입력하세요.';
  if (!values.startAt || Number.isNaN(start.getTime())) errors.startAt = '시작 일시를 입력하세요.';
  if (!values.endAt || Number.isNaN(end.getTime())) errors.endAt = '종료 일시를 입력하세요.';
  if (!errors.endAt && !errors.startAt && end.getTime() <= start.getTime()) {
    errors.endAt = '종료 일시는 시작 일시 이후여야 합니다.';
  }
  if (!errors.startAt && !errors.endAt && hasReservationConflict(values, reservations, ignoredReservationId)) {
    errors.overlap = '동일 시설에 같은 시간대 주요 일정이 이미 있습니다.';
  }

  return errors;
};

export const hasReservationErrors = (errors: ReservationValidationErrors) =>
  Object.values(errors).some(Boolean);
