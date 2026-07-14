import type { Facility, FacilityReservation, FacilityRole, ReservationFormValues, ReservationStatus } from './types';

export interface ReservationActor {
  id: string;
  name: string;
  role: FacilityRole;
}

const getFacilityName = (values: ReservationFormValues, facility?: Facility) =>
  facility?.name || values.location.trim() || '-';

export const buildFacilityUsageSchedule = (
  values: ReservationFormValues,
  facility: Facility | undefined,
  actor: ReservationActor,
  now = new Date(),
): FacilityReservation => {
  const timestamp = now.toISOString();

  return {
    id: `reservation_${now.getTime()}`,
    facilityId: facility?.id || '',
    facilityName: getFacilityName(values, facility),
    scheduleKind: values.scheduleKind,
    title: values.title.trim(),
    location: values.location.trim(),
    requesterId: actor.id,
    requesterName: actor.name,
    requesterRole: actor.role,
    requesterOrganization: values.requesterOrganization.trim(),
    purpose: values.purpose.trim(),
    startAt: values.startAt,
    endAt: values.endAt,
    status: 'pending',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

export const updateFacilityUsageSchedule = (
  reservation: FacilityReservation,
  values: ReservationFormValues,
  facility: Facility | undefined,
  now = new Date(),
): FacilityReservation => ({
  ...reservation,
  facilityId: facility?.id || '',
  facilityName: getFacilityName(values, facility),
  scheduleKind: values.scheduleKind,
  title: values.title.trim(),
  location: values.location.trim(),
  requesterOrganization: values.requesterOrganization.trim(),
  purpose: values.purpose.trim(),
  startAt: values.startAt,
  endAt: values.endAt,
  status: reservation.status === 'cancelled' ? 'pending' : reservation.status,
  updatedAt: now.toISOString(),
});

export const updateReservationStatus = (
  reservations: FacilityReservation[],
  id: string,
  status: ReservationStatus,
  rejectReason?: string,
  now = new Date(),
) => reservations.map((reservation) => (
  reservation.id === id
    ? { ...reservation, status, rejectReason, updatedAt: now.toISOString() }
    : reservation
));
