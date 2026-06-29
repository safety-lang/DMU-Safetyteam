import type { FacilityModuleSnapshot, FacilityUserAccess } from './facility/types';
import type { DailyLogWorkType } from './lib/dailyLogWorkTypes';

export type WorkCategory = string;

export type TaskStatus = '대기중' | '진행중' | '완료';

export type TaskPriority = '긴급' | '보통' | '낮음';

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  specialty: string;
  avatar: string;
  email?: string;
}

export interface DailyLogComment {
  id: string;
  senderName: string;
  senderRole: string;
  content: string;
  timestamp: string;
}

export interface DailyLog {
  id: string;
  date: string; // YYYY-MM-DD
  employeeId: string;
  employeeName: string;
  employeeRole: string; // 과장, 반장, 계장
  workType?: DailyLogWorkType;
  workTitle?: string;
  workLocation?: string;
  morningPlan: string; // 출근 보고: 오늘 할 일
  morningSubmittedAt?: string;
  eveningResult: string; // 퇴근 보고: 완성, 완료 결과 등 진행 상황
  remarks?: string; // 비고: 유의사항, 개선사항, 검토사항, 건의사항
  eveningStatus: '대기중' | '진행중' | '완료';
  eveningSubmittedAt?: string;
  managerFeedbackList: DailyLogComment[]; // 팀장이 남기는 피드백 멘트 및 지시사항
}

export interface TaskComment {
  id: string;
  senderName: string;
  senderRole: string;
  content: string;
  timestamp: string;
}

export interface TaskHistory {
  id: string;
  timestamp: string;
  user: string;
  action: string;
}

export interface Task {
  id: string;
  title: string;
  category: WorkCategory;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  location: string;
  assignee: string; // User ID or Name
  createdAt: string;
  dueDate?: string;
  photoUrl?: string; // Original request photo
  completionPhotoUrl?: string; // Report photo
  completionReport?: string; // Report comments
  completionRemarks?: string; // 비고: 유의사항, 개선사항, 검토사항, 건의사항
  completedAt?: string;
  comments: TaskComment[];
  history: TaskHistory[];
}

export interface TeamNotification {
  id: string;
  taskId: string;
  taskTitle: string;
  type: '등록' | '진행' | '완료보고' | '댓글';
  senderName: string;
  senderRole: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface FacilityAppState {
  app: 'DMU_FACILITY_MANAGEMENT';
  version: 1;
  exportedAt: string;
  tasks: Task[];
  notifications: TeamNotification[];
  dailyLogs: DailyLog[];
  syncedTaskIds: string[];
  calendarWebAppUrl: string;
  calendarWebhookSecret: string;
  soundEnabled: boolean;
  workCategories?: string[];
  facilityUserAccess?: FacilityUserAccess[];
  facilityModule?: FacilityModuleSnapshot;
}
