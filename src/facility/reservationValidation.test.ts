import { DEFAULT_FACILITIES } from './facilityData';
import { FacilityReservation, ReservationFormValues } from './types';
import { hasReservationErrors, validateReservationForm } from './reservationValidation';

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const now = new Date('2026-05-27T00:00:00');
const facility = DEFAULT_FACILITIES[0];
const baseForm: ReservationFormValues = {
  facilityId: facility.id,
  scheduleKind: '대관',
  title: '대강당 대관',
  location: facility.location,
  requesterOrganization: '총학생회',
  purpose: '행사 운영',
  startAt: '2026-05-28T09:00',
  endAt: '2026-05-28T10:00',
};

const activeReservation: FacilityReservation = {
  id: 'reservation_test',
  facilityId: facility.id,
  facilityName: facility.name,
  scheduleKind: '대관',
  title: '기존 대관',
  location: facility.location,
  requesterId: 'user_1',
  requesterName: '요청자',
  requesterRole: 'staff',
  requesterOrganization: '건축학과',
  purpose: '기존 예약',
  startAt: '2026-05-28T09:30',
  endAt: '2026-05-28T10:30',
  status: 'in_progress',
  createdAt: '2026-05-27T01:00:00Z',
  updatedAt: '2026-05-27T01:00:00Z',
};

assert(!hasReservationErrors(validateReservationForm(baseForm, DEFAULT_FACILITIES, [], now)), 'valid major schedule should pass');
assert(!hasReservationErrors(validateReservationForm({ ...baseForm, facilityId: '', location: '' }, DEFAULT_FACILITIES, [], now)), 'facility/location should be optional');
assert(Boolean(validateReservationForm({ ...baseForm, title: '' }, DEFAULT_FACILITIES, [], now).title), 'title should be required');
assert(Boolean(validateReservationForm(baseForm, DEFAULT_FACILITIES, [activeReservation], now).overlap), 'overlap should fail for same facility');
assert(!validateReservationForm(baseForm, DEFAULT_FACILITIES, [activeReservation], now, activeReservation.id).overlap, 'editing the same schedule should not conflict with itself');
assert(Boolean(validateReservationForm({ ...baseForm, endAt: '2026-05-28T08:00' }, DEFAULT_FACILITIES, [], now).endAt), 'end before start should fail');

console.log('reservation validation tests passed');
