import { useEffect, useMemo, useState } from 'react';
import { FACILITY_SNAPSHOT_APPLIED_EVENT } from './facilitySnapshot';
import { reservationRepository } from './reservationRepository';
import {
  buildFacilityUsageSchedule,
  updateFacilityUsageSchedule,
  updateReservationStatus,
} from './reservationState';
import type { ReservationActor } from './reservationState';
import {
  Facility,
  FacilityReservation,
  ReservationFormValues,
  ReservationStatus,
} from './types';

const PAGE_SIZE = 5;

export const useReservations = (actor: ReservationActor) => {
  const [reservations, setReservations] = useState<FacilityReservation[]>(() => reservationRepository.list());
  const [page, setPage] = useState(1);

  useEffect(() => reservationRepository.saveAll(reservations), [reservations]);

  useEffect(() => {
    const refreshReservations = () => {
      setReservations(reservationRepository.list());
      setPage(1);
    };

    window.addEventListener(FACILITY_SNAPSHOT_APPLIED_EVENT, refreshReservations);
    return () => window.removeEventListener(FACILITY_SNAPSHOT_APPLIED_EVENT, refreshReservations);
  }, []);

  const visibleReservations = useMemo(() => {
    if (actor.role === 'admin' || actor.role === 'staff') return reservations;
    return reservations.filter((item) => item.requesterId === actor.id);
  }, [actor.id, actor.role, reservations]);

  const sortedReservations = useMemo(() => [...visibleReservations].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ), [visibleReservations]);

  const pageCount = Math.max(1, Math.ceil(sortedReservations.length / PAGE_SIZE));
  const pageItems = sortedReservations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const addReservation = (values: ReservationFormValues, facility?: Facility) =>
    setReservations((previous) => [buildFacilityUsageSchedule(values, facility, actor), ...previous]);

  const saveReservation = (id: string, values: ReservationFormValues, facility?: Facility) =>
    setReservations((previous) => previous.map((reservation) => (
      reservation.id === id ? updateFacilityUsageSchedule(reservation, values, facility) : reservation
    )));

  const cancelReservation = (id: string) =>
    setReservations((previous) => updateReservationStatus(previous, id, 'cancelled'));

  const changeStatus = (id: string, status: ReservationStatus, rejectReason?: string) =>
    setReservations((previous) => updateReservationStatus(previous, id, status, rejectReason));

  return {
    reservations,
    visibleReservations: sortedReservations,
    page,
    pageCount,
    pageItems,
    setPage,
    addReservation,
    saveReservation,
    cancelReservation,
    changeStatus,
  };
};
