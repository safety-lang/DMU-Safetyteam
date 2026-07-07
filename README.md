# 시설관리 업무 관리 시스템

시설관리팀의 작업지시 발행, 진행 상태 확인, 완료 보고, 소리 알림, Google 할 일 전송을 관리하는 로컬 웹앱입니다.

## 실행 방법

1. 의존성을 설치합니다.

   ```bash
   npm install
   ```

2. 개발 서버를 실행합니다.

   ```bash
   npm run dev
   ```

3. 브라우저에서 아래 주소를 엽니다.

   ```text
   http://localhost:3000/
   ```

## 미리보기 실행

빌드된 앱을 확인하려면 아래 순서로 실행합니다.

```bash
npm run build
npm run preview -- --host=0.0.0.0
```

기본 미리보기 주소는 아래와 같습니다.

```text
http://localhost:4173/
```

Windows에서 바로 실행하려면 `start-preview.cmd`를 두 번 클릭하세요. 이 파일은 앱을 빌드한 뒤 `http://localhost:4173/` 주소를 자동으로 엽니다. 연결 오류가 나면 실행 창이 닫혀 있는지 확인하고 `start-preview.cmd`를 다시 실행하면 됩니다.

## 팀원에게 임시 공유

`http://localhost:4173/` 주소는 내 컴퓨터에서만 열리는 주소입니다. 팀원에게 그대로 보내면 팀원 PC에서는 접속되지 않습니다.

같은 사무실/학교 네트워크에서 임시로 함께 쓰려면 `start-team-share.cmd`를 두 번 클릭하세요. 이 파일은 앱을 빌드한 뒤 팀원에게 공유할 수 있는 후보 주소를 검은 창에 표시하고, 같은 PC의 `data` 폴더에 공용 작업 데이터를 저장합니다.

```text
http://내-PC-IP주소:4173/
```

팀원에게는 검은 창에 표시된 후보 주소 중 접속되는 주소를 공유하면 됩니다. Windows 방화벽 확인창이 뜨면 허용을 눌러야 팀원 PC에서 접속할 수 있습니다. 공유 중에는 실행 창을 닫지 마세요.

앱 화면의 `팀원 공용 저장소` 영역에서 `현재 데이터 서버 저장`을 누르면 팀장 PC의 공용 저장소에 저장되고, 다른 팀원은 `서버에서 불러오기`로 같은 데이터를 가져올 수 있습니다. 운영 전에 앱의 `전체 백업` 버튼으로 별도 백업 파일도 저장해 두세요.

## Google 할 일 연동

이 앱은 Firebase 로그인 없이 Google Apps Script 웹앱을 통해 `rhs@dongyang.ac.kr` 계정의 `시설관리팀 공유 일정` Google 할 일 목록에 업무지정을 전송합니다. 할 일은 Google 캘린더 화면의 할 일 영역에서 확인합니다.

1. `copy-apps-script-code.cmd`를 두 번 클릭한 뒤 Google Apps Script 프로젝트의 `Code.gs`에 붙여넣습니다.
2. `copy-apps-script-manifest.cmd`를 두 번 클릭한 뒤 Apps Script의 `appsscript.json`에 붙여넣습니다.
3. `rhs@dongyang.ac.kr` 계정으로 Apps Script를 웹앱으로 배포합니다. 실행 계정은 `나`로 설정하고 Google Tasks 권한을 승인합니다.
4. 생성된 `/exec` URL을 앱의 `Apps Script 웹앱 URL` 칸에 저장합니다.
5. 앱의 `웹앱 확인`을 눌러 `ok: true`와 `tasksAccess: true`가 보이는지 확인합니다.
6. 작업지시 상세 화면에서 `할 일 전송`을 눌러 Google 캘린더의 할 일에 등록되는지 확인합니다.

Google Tasks API는 할 일의 날짜만 저장하고 시간은 저장하지 않습니다. 앱에서 선택한 시간은 할 일 메모의 `완료 예정일시`에 함께 기록됩니다.

자세한 배포 절차는 `apps-script/README.md`를 참고하세요.

## 확인 명령

```bash
npm run lint
npm run test
npm run build
```

## Supabase 전환 준비

현재 시설 CRUD, 예약, 유지보수, 알림, 사용자 권한 데이터는 브라우저 저장소에 저장됩니다. Supabase 프로젝트를 연결할 때는 `.env`에 아래 값을 넣고, `src/facility/*Repository.ts` 파일의 저장소 구현을 Supabase 쿼리로 교체하면 됩니다.

```text
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

저장소 인터페이스는 `src/facility/dataSourceTypes.ts`에 분리되어 있어, 화면 컴포넌트와 훅은 그대로 두고 데이터 계층만 바꿀 수 있습니다.

현재 작업 환경에는 `@supabase/supabase-js`, `zustand`, `react-hook-form`, `zod`, `@tanstack/react-table` 패키지가 아직 설치되어 있지 않습니다. 정식 Supabase Auth 전환 시에는 먼저 아래 패키지를 설치한 뒤 `src/facility/supabaseConfig.ts`, `src/facility/authContract.ts`, `src/facility/supabaseMappers.ts`를 기준으로 연결하면 됩니다.

```bash
npm install @supabase/supabase-js zustand react-hook-form zod @tanstack/react-table
```

Supabase SQL 편집기에서는 아래 파일을 실행하면 됩니다.

```text
supabase/facility-management-schema.sql
supabase/seed-facility-demo-data.sql
```

이 스키마에는 시설, 예약, 유지보수, 점검일정, 자산, 알림, 사용자 권한 테이블과 RLS 정책이 포함되어 있습니다. 예약은 Supabase 단계에서도 같은 시설의 승인대기/승인 예약 시간이 겹치지 않도록 제약을 둡니다.

## Vercel 배포

Vercel에는 `vercel.json`이 추가되어 있습니다. 프로젝트를 Vercel에 연결한 뒤 환경변수에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 넣고 배포하면 됩니다.
