export type FacilityRole = 'admin' | 'staff' | 'user';

export interface FacilityUserAccess {
  userId: string;
  role: FacilityRole;
  active: boolean;
  updatedAt: string;
}

export type FacilityCategory =
  | '강의실'
  | '실습실'
  | '행정사무실'
  | '회의실'
  | '도서관'
  | '건물명';

export type FacilityStatus = '운영중' | '점검중' | '예약중지';

export interface Facility {
  id: string;
  name: string;
  category: FacilityCategory;
  capacity: number;
  location: string;
  description: string;
  status: FacilityStatus;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FacilityFormValues {
  name: string;
  category: FacilityCategory;
  capacity: string;
  location: string;
  description: string;
  status: FacilityStatus;
  imageUrl?: string;
}

export interface FacilityValidationErrors {
  name?: string;
  capacity?: string;
  location?: string;
  description?: string;
  imageUrl?: string;
}

export type MajorScheduleKind = '대관' | '점검' | '행사' | '외부업체' | '법정검사' | '기타';

export type ReservationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface FacilityReservation {
  id: string;
  facilityId: string;
  facilityName: string;
  scheduleKind?: MajorScheduleKind;
  title?: string;
  location?: string;
  requesterId: string;
  requesterName: string;
  requesterRole: FacilityRole;
  requesterOrganization?: string;
  purpose: string;
  startAt: string;
  endAt: string;
  status: ReservationStatus;
  rejectReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationFormValues {
  facilityId: string;
  scheduleKind: MajorScheduleKind;
  title: string;
  location: string;
  requesterOrganization: string;
  purpose: string;
  startAt: string;
  endAt: string;
}

export interface ReservationValidationErrors {
  facilityId?: string;
  title?: string;
  requesterOrganization?: string;
  purpose?: string;
  startAt?: string;
  endAt?: string;
  overlap?: string;
}

export type MaintenancePriority = 'low' | 'normal' | 'urgent';

export type MaintenanceStatus = 'submitted' | 'received' | 'in_progress' | 'completed';

export interface FacilityMaintenanceRequest {
  id: string;
  facilityId: string;
  facilityName: string;
  requesterId: string;
  requesterName: string;
  requesterRole: FacilityRole;
  title: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceFormValues {
  facilityId: string;
  title: string;
  description: string;
  priority: MaintenancePriority;
  photoUrl?: string;
}

export interface MaintenanceValidationErrors {
  facilityId?: string;
  title?: string;
  description?: string;
}

export type InspectionStatus = 'scheduled' | 'completed';

export type InspectionCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface FacilityInspectionSchedule {
  id: string;
  facilityId: string;
  facilityName: string;
  title: string;
  inspectionType: string;
  cycle: InspectionCycle;
  inspectorName: string;
  dueDate: string;
  status: InspectionStatus;
  notes?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionFormValues {
  facilityId: string;
  title: string;
  inspectionType: string;
  cycle: InspectionCycle;
  inspectorName: string;
  dueDate: string;
  notes?: string;
}

export type FacilityAssetStatus = 'active' | 'maintenance' | 'retired';

export type FacilityAssetCondition = 'good' | 'watch' | 'repair';

export interface FacilityAsset {
  id: string;
  facilityId: string;
  facilityName: string;
  name: string;
  assetTag: string;
  category: string;
  condition: FacilityAssetCondition;
  status: FacilityAssetStatus;
  managerName: string;
  purchasedAt?: string;
  lastCheckedAt?: string;
  value?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type FacilityNotificationKind =
  | 'reservation_approved'
  | 'reservation_rejected'
  | 'maintenance_completed';

export interface FacilityNotification {
  id: string;
  recipientId: string;
  recipientName: string;
  kind: FacilityNotificationKind;
  title: string;
  message: string;
  sourceId: string;
  read: boolean;
  createdAt: string;
}

export type WorkUnitDifficulty = 'A' | 'B' | 'C';

export type WorkLedgerSource =
  | '업무 지정'
  | '담당자 자율 등록'
  | '점검일정';

export interface WorkUnitDefinition {
  id: string;
  category: string;
  name: string;
  dutyTypes: string[];
  difficulty: WorkUnitDifficulty;
  annualHours?: number;
  period: string;
  approver: string;
  regulation: string;
  relatedForms: string[];
  relatedDepartments: string[];
  keyProcedures: string[];
  cautions: string[];
  evidenceHint: string;
  performanceMetric: string;
}

export interface WorkLedgerEntry {
  id: string;
  source: WorkLedgerSource;
  sourceId: string;
  date: string;
  title: string;
  unitId: string;
  unitName: string;
  category: string;
  status: string;
  description: string;
  evidence: string;
  facilityName?: string;
  location?: string;
  assignee?: string;
  annualHours?: number;
  actualHours?: number;
  createdAt: string;
}

export interface FacilityModuleSnapshot {
  facilities: Facility[];
  reservations: FacilityReservation[];
  maintenanceRequests: FacilityMaintenanceRequest[];
  inspectionSchedules: FacilityInspectionSchedule[];
  assets: FacilityAsset[];
  notifications: FacilityNotification[];
  userAccess: FacilityUserAccess[];
}
