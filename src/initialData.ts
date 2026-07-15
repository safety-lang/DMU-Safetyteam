import { Task, UserProfile, TeamNotification, DailyLog } from './types';

export const DEFAULT_USERS: UserProfile[] = [
  {
    id: 'user_manager',
    name: '나형석',
    role: '팀장',
    specialty: '시설관리 통합 총괄 및 공사 관리',
    avatar: '👨‍💼',
    email: 'rhs@dongyang.ac.kr',
  },
  {
    id: 'user_lee',
    name: '이인혁',
    role: '과장',
    specialty: '수배전반 정비, 전기안전 전장설비 관리',
    avatar: '⚡',
    email: 'ihlee84@dongyang.ac.kr',
  },
  {
    id: 'user_park',
    name: '박희찬',
    role: '과장',
    specialty: '중앙 공조시스템, 개별 냉난방(GHP) 점검',
    avatar: '❄️',
    email: 'phc0712@dongyang.ac.kr',
  },
  {
    id: 'user_jang',
    name: '장민석',
    role: '과장',
    specialty: '건축물 영선공사, 바닥/벽체 크랙 충진 및 우수관 방수',
    avatar: '🧱',
    email: 'msjang82@dongyang.ac.kr',
  },
  {
    id: 'user_park_sh',
    name: '박성훈',
    role: '과장',
    specialty: '고가 정밀 계측 기자재 수리 및 전산 자산 실사',
    avatar: '📊',
    email: 'shpark@dongyang.ac.kr',
  },
  {
    id: 'user_oh',
    name: '오승훈',
    role: '반장',
    specialty: '강당 공조팬 보정 및 공용부 기계 설비 점검',
    avatar: '⚙️',
    email: 'osh@dongyang.ac.kr',
  },
  {
    id: 'user_kim_ih',
    name: '김익현',
    role: '계장',
    specialty: '우수 배출 토널 세정 및 단지 외곽 조경 유지보수',
    avatar: '🌳',
    email: 'ikh831@dongyang.ac.kr',
  },
  {
    id: 'user_kim_yh',
    name: '김영해',
    role: '계장',
    specialty: '소독 방역 물품 수급, 공용 소모품 공급 및 전산 행정',
    avatar: '📝',
    email: 'seakim@dongyang.ac.kr',
  },
];

export const DEFAULT_TASKS: Task[] = [
  {
    id: 'task_1',
    title: '지하 1층 전기실 비상 수배전판 누전 차단기 점검 및 교체',
    category: '안전관리',
    description: 'B1 대형 부하라인 비상 수배전반 배선용 차단기 3호 인접 단자에서 미세 과열 감지 및 간헐적 웅 울림 현상 목격됨. 열화상 카메라 분석 결과 이상 온도 확인되어 예비 부품으로 교체 필요.',
    status: '대기중',
    priority: '긴급',
    location: '지하 1층 전기 배전실',
    assignee: '이인혁',
    createdAt: '2026-05-22T08:30:00Z',
    comments: [
      {
        id: 'c1',
        senderName: '나형석',
        senderRole: '팀장',
        content: '수배전반 작업 투입 전 반드시 절연장구 장착 및 메인 전원 전로 차단을 실시간으로 소통해 작업 완료 후 전송하십시오. 상시 점검표 누락 주의바랍니다.',
        timestamp: '2026-05-22T09:15:00Z',
      }
    ],
    history: [
      {
        id: 'h1',
        timestamp: '2026-05-22T08:30:00Z',
        user: '나형석 (팀장)',
        action: '신규 전기 보수 작업을 등록하였습니다.'
      }
    ]
  },
  {
    id: 'task_2',
    title: '본관 3층 대회의실 중앙 개별 냉난방기(GHP) 소음 및 가스 주입 점검',
    category: '시설관리',
    description: '3층 대회의실 가습 운전 후 웅웅거리는 휀 날개 마찰 소음 발생으로 임직원 민원 접수. 냉매 배관 결로 여부와 냉매 충전 상태(R-410a 게이지 테스트) 파악 바람.',
    status: '진행중',
    priority: '보통',
    location: '본관 3F 대회의실 천장형 4WAY 2호기',
    assignee: '박희찬',
    createdAt: '2026-05-23T01:45:00Z',
    comments: [
      {
        id: 'c2_1',
        senderName: '박희찬',
        senderRole: '과장',
        content: '회의가 오후 2시 이후 마감되므로, 오후 2시 10분에 사다리 반입 등 소음 유발 세부 작업 예정입니다.',
        timestamp: '2026-05-23T02:00:00Z',
      },
      {
        id: 'c2_2',
        senderName: '나형석',
        senderRole: '팀장',
        content: '이해했습니다. 회의 방해가 최소화되도록 시간 배분 감사드립니다. 작업 마친 후 필터 물청소도 가볍게 지원해 주십시오.',
        timestamp: '2026-05-23T03:30:00Z',
      }
    ],
    history: [
      {
        id: 'h2_1',
        timestamp: '2026-05-23T01:45:00Z',
        user: '나형석 (팀장)',
        action: '요구 기반 냉난방기 민원 해결 업무를 등록하였습니다.'
      },
      {
        id: 'h2_2',
        timestamp: '2026-05-23T02:00:00Z',
        user: '박희찬 (과장)',
        action: '업무 상태를 [진행중]으로 전환하고 코멘트를 남겼습니다.'
      }
    ]
  },
  {
    id: 'task_3',
    title: '신관 우측 옥상 우수관 주변 바닥 크랙 충진 우레탄 방수 보수공사',
    category: '공사관리',
    description: '장마 전 선제 방수 점검. 신관 우상단 드레인 주변 방수 코팅 박리 부위(약 2.5㎡) 누수 우려 지점. 구 들뜸 방수재를 스크래퍼로 걷어낸 뒤 프라이머 도포 및 친환경 우레탄 충진 작업 완료 필요.',
    status: '완료',
    priority: '보통',
    location: '신관 지상 6층 옥상 우측 배수관 배관 주변',
    assignee: '장민석',
    createdAt: '2026-05-21T10:00:00Z',
    completedAt: '2026-05-22T17:00:00Z',
    completionReport: '들뜸 방수피막 부분 완전히 박리 후 바닥면 건조 확인. 우레탄 탄성 씰런트 1차 주입 후 상도 페인트 도색 2회 전개 진행 완료하였습니다. 작업 전후 비교 사진 올렸습니다.',
    comments: [
      {
        id: 'c3_1',
        senderName: '장민석',
        senderRole: '과장',
        content: '콘크리트 내부에 잔존 수분이 남아있어 건조 시간이 좀 걸렸습니다. 완전히 마른 상태에서 방수코팅을 발라 결합력 상승했습니다.',
        timestamp: '2026-05-22T16:45:00Z',
      }
    ],
    history: [
      {
        id: 'h3_1',
        timestamp: '2026-05-21T10:00:00Z',
        user: '나형석 (팀장)',
        action: '신규 건축 영선 보수공사 업무를 등록하였습니다.'
      },
      {
        id: 'h3_2',
        timestamp: '2026-05-22T13:10:00Z',
        user: '장민석 (과장)',
        action: '현장 스크래핑 작업을 마무리하고 크랙 충진제를 주입했습니다.'
      },
      {
        id: 'h3_3',
        timestamp: '2026-05-22T17:00:00Z',
        user: '장민석 (과장)',
        action: '작업 완료 보고서 등록 및 사진을 업로드하였습니다.'
      }
    ]
  },
  {
    id: 'task_4',
    title: '2분기 정기 자산 관리 - 전기 및 설비실 특수 장비 실사 및 태깅',
    category: '자산관리',
    description: '고가 기자재 및 복합 측정장비(플루크 오실로스코프, 고압 절연저항기, 배관 탐지 콤프 등) 총 14개 품목 정밀 검정 주기에 맞춰 RFID / 바코드 스티커 마모상태 파악 및 재태깅.',
    status: '대기중',
    priority: '낮음',
    location: '지하 1층 제2기계실 내 캐비닛 A-4',
    assignee: '박성훈',
    createdAt: '2026-05-23T04:10:00Z',
    comments: [],
    history: [
      {
        id: 'h4_1',
        timestamp: '2026-05-23T04:10:00Z',
        user: '나형석 (팀장)',
        action: '정기 자산 일제 조사를 등록하였습니다.'
      }
    ]
  },
  {
    id: 'task_5',
    title: '본관 인승용 승강기 2호기 출입문 부도체 롤러 및 레일 구동 기자재 윤활 점검',
    category: '기술지원',
    description: '승강기 문 개폐시 발생하는 서걱거리는 고주파 마찰 가이드 레일 불순물 제거 및 전용 실리콘 오일 스프레이 정비. 2차 충격완화 안전 고무 패드 마모량 계측.',
    status: '진행중',
    priority: '긴급',
    location: '본관 1층~11층 인승용 2호기 승강기',
    assignee: '오승훈',
    createdAt: '2026-05-23T05:00:00Z',
    comments: [
      {
        id: 'c5_1',
        senderName: '오승훈',
        senderRole: '반장',
        content: '현재 외부 승강기 점검 전문 자문 담당자와 주행 케이블 동시 피드백 중입니다. 1층 도어 부분 가이드 하체 손상이 얕게 있어 부싱 세밀 조정 들어갑니다.',
        timestamp: '2026-05-23T07:20:00Z',
      }
    ],
    history: [
      {
        id: 'h5_1',
        timestamp: '2026-05-23T05:00:00Z',
        user: '나형석 (팀장)',
        action: '중요 시설 안전 등급 승강기 보수 지시를 등록하였습니다.'
      },
      {
        id: 'h5_2',
        timestamp: '2026-05-23T06:15:00Z',
        user: '오승훈 (반장)',
        action: '승강기 유지보수 구동 분석을 개시하였습니다.'
      }
    ]
  },
  {
    id: 'task_6',
    title: '연구실 안전관리 점검 - 화학물질 보관함 및 비상샤워기 상태 확인',
    category: '안전관리',
    description: '공용 연구실 내 화학물질 보관함 잠금 상태, MSDS 비치 여부, 비상샤워기 및 세안기 작동 상태를 확인하고 미흡 사항을 사진과 함께 기록합니다.',
    status: '대기중',
    priority: '긴급',
    location: '공학관 4층 공용 연구실 및 복도 비상설비',
    assignee: '김익현',
    createdAt: '2026-05-24T00:30:00Z',
    comments: [
      {
        id: 'c6_1',
        senderName: '나형석',
        senderRole: '팀장',
        content: '연구실 안전 관련 항목은 점검표 누락 없이 확인하고, 이상 발견 시 즉시 사진을 첨부해 공유 바랍니다.',
        timestamp: '2026-05-24T00:45:00Z',
      }
    ],
    history: [
      {
        id: 'h6_1',
        timestamp: '2026-05-24T00:30:00Z',
        user: '나형석 (팀장)',
        action: '신규 안전관리 점검 업무를 등록하였습니다.'
      }
    ]
  }
];

export const DEFAULT_NOTIFICATIONS: TeamNotification[] = [
  {
    id: 'notif_1',
    taskId: 'task_3',
    taskTitle: '신관 우측 옥상 우수관 주변 바닥 크랙 충진 우레탄 방수 보수공사',
    type: '완료보고',
    senderName: '장민석',
    senderRole: '과장',
    message: '[완료보고] 장민석 과장이 신관 옥상 우수관 주변 보수공사를 완료해 완료 결과를 검토 바랍니다.',
    timestamp: '2026-05-22T17:00:00Z',
    read: false,
  },
  {
    id: 'notif_2',
    taskId: 'task_2',
    taskTitle: '본관 3층 대회의실 중앙 개별 냉난방기(GHP) 소음 및 가스 주입 점검',
    type: '진행',
    senderName: '박희찬',
    senderRole: '과장',
    message: '[작업진행] 박희찬 과장이 3층 대회의실 에어컨 소음 점검 작업을 진행 중으로 전환했습니다.',
    timestamp: '2026-05-23T02:00:00Z',
    read: true,
  }
];

export const DEFAULT_DAILY_LOGS: DailyLog[] = [
  {
    id: 'log_lee_1',
    date: '2026-05-23',
    employeeId: 'user_lee',
    employeeName: '이인혁',
    employeeRole: '과장',
    morningPlan: '전기 기계동 전력 제어반 3호 릴레이 불량 소거 점검 및 세부 계측 테스트',
    morningSubmittedAt: '2026-05-23T08:10:00Z',
    eveningResult: '전력 제어반 릴레이 2개 조 신규 예비품으로 교체 교조 완료하였으며, 최종 전압 분산 마진 계측값 220.4V로 한계 정합성 확인 마침.',
    eveningStatus: '완료',
    eveningSubmittedAt: '2026-05-23T17:40:00Z',
    managerFeedbackList: [
      {
        id: 'fb_lee_1',
        senderName: '나형석',
        senderRole: '팀장',
        content: '점검 이력 전산 대장에 장비 넘버링 기재했는지 최종 검산하고 배전반 락커 보강 조치 부탁드립니다.',
        timestamp: '2026-05-23T18:00:00Z'
      }
    ]
  },
  {
    id: 'log_park_1',
    date: '2026-05-23',
    employeeId: 'user_park',
    employeeName: '박희찬',
    employeeRole: '과장',
    morningPlan: '임원실 멀티히트펌프 가스 잔류 누수 정밀 디텍터 탐지 및 필터 유기 오염 세정',
    morningSubmittedAt: '2026-05-23T08:15:00Z',
    eveningResult: '냉매 라인 가스 유입 미세 이음매 발견하여 리크스톱 주입 후 압축압 계측 대기 중. 필터 세척은 완료하여 장착함.',
    eveningStatus: '진행중',
    eveningSubmittedAt: '2026-05-23T17:50:00Z',
    managerFeedbackList: []
  },
  {
    id: 'log_jang_1',
    date: '2026-05-23',
    employeeId: 'user_jang',
    employeeName: '장민석',
    employeeRole: '과장',
    morningPlan: '신관 우측 주차 라인 우레탄 균열 보완 충충진 보수공사 및 턱 낮춤 전개',
    morningSubmittedAt: '2026-05-23T08:20:00Z',
    eveningResult: '보완 충진 우레탄 도색 코팅 1차 건조 마무리함. 내일 점심 전 최종 방수 가이드 점검 완료 예정.',
    eveningStatus: '완료',
    eveningSubmittedAt: '2026-05-23T17:20:00Z',
    managerFeedbackList: [
      {
        id: 'fb_jang_1',
        senderName: '나형석',
        senderRole: '팀장',
        content: '고온 다습한 날씨니까 들뜸 없도록 도포층 두께 안착 상태를 수시로 실사 바랄게요.',
        timestamp: '2026-05-23T17:55:00Z'
      }
    ]
  },
  {
    id: 'log_park_sh_1',
    date: '2026-05-23',
    employeeId: 'user_park_sh',
    employeeName: '박성훈',
    employeeRole: '과장',
    morningPlan: '1층 제2서버랙 통합 케이블 타이 구조 재배열 및 미연계 광모듈 라벨 부착',
    morningSubmittedAt: '2026-05-23T08:05:00Z',
    eveningResult: '광모듈 신규 라벨 16개 번들 태깅 완료하여 대장 정리 마침. 공용 랙 먼지 송풍 흡입 전산 정화.',
    eveningStatus: '완료',
    eveningSubmittedAt: '2026-05-23T16:55:00Z',
    managerFeedbackList: []
  },
  {
    id: 'log_oh_1',
    date: '2026-05-23',
    employeeId: 'user_oh',
    employeeName: '오승훈',
    employeeRole: '반장',
    morningPlan: '공동 로비 가습기 팬 오일 구리스 도포 및 휀 벨트 결합력 장력 조율',
    morningSubmittedAt: '2026-05-23T08:30:00Z',
    eveningResult: '장력 기어 나사 보강 완료함. 구리스 도색 마친 후 작동 소음 측정 결과 이상 무, 데시벨 42dB로 정상 범위 안착.',
    eveningStatus: '완료',
    eveningSubmittedAt: '2026-05-23T17:45:00Z',
    managerFeedbackList: []
  },
  {
    id: 'log_kim_ih_1',
    date: '2026-05-23',
    employeeId: 'user_kim_ih',
    employeeName: '김익현',
    employeeRole: '계장',
    morningPlan: '서쪽 경사 배수 정원 하수로 진입 낙엽 제거 및 격석 보수 지반 다짐',
    morningSubmittedAt: '2026-05-23T08:25:00Z',
    eveningResult: '낙엽 및 모래 퇴적 원인 제거 마침. 격석 붕괴 취약 구역 3곳 보강 말뚝 정비하고 보양 리본 설치 완료.',
    eveningStatus: '완료',
    eveningSubmittedAt: '2026-05-23T17:30:00Z',
    managerFeedbackList: [
      {
        id: 'fb_kim_ih_1',
        senderName: '나형석',
        senderRole: '팀장',
        content: '수고하셨습니다. 말뚝 고정부 하단 유실 없도록 이번 방수 체크 시 보강 라인 같이 실사하겠습니다.',
        timestamp: '2026-05-23T18:10:00Z'
      }
    ]
  },
  {
    id: 'log_kim_yh_1',
    date: '2026-05-23',
    employeeId: 'user_kim_yh',
    employeeName: '김영해',
    employeeRole: '계장',
    morningPlan: '정기 소독제 분말 24박스 수령 대조 및 층별 보조 카트 비치 물품 불출',
    morningSubmittedAt: '2026-05-23T08:08:00Z',
    eveningResult: '24박스 입고 검수 완료하여 소독 약장 캐비닛 2호에 적재 완료. 층별 지급 현황표 업데이트 전산화 업로드 마침.',
    eveningStatus: '완료',
    eveningSubmittedAt: '2026-05-23T16:30:00Z',
    managerFeedbackList: []
  }
];


