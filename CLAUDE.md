# Project Summary: 분기기 관리 시스템 (Switch Management System)

이 프로젝트는 철도 분기기 관련 공지사항, 회의록, 도면 및 자료를 관리하는 웹 애플리케이션입니다.

## 📂 폴더 구조
- `src/`: 소스 코드 메인 디렉토리
  - `components/`: 공통 UI 컴포넌트 (Layout, Sidebar, Toast 등)
  - `pages/`: 각 라우트별 페이지 컴포넌트
  - `hooks/`: 커스텀 훅 (useToast 등)
  - `services/`: 외부 서비스 연동 로직
  - `lib/`: 유틸리티 함수
  - `App.tsx`: 메인 애플리케이션 로직 및 라우팅 설정
  - `firebase.ts`: Firebase 초기화 및 Firestore 헬퍼 함수
  - `types.ts`: TypeScript 인터페이스 및 타입 정의
  - `constants.ts`: 라우트 경로 및 상수 정의
- `public/`: 정적 자산 (아이콘 등)
- `root/`: 설정 파일 (.env.example, metadata.json 등)

## 📄 페이지 파일 경로 및 라우트
- **대시보드**: `/` (`src/pages/Dashboard.tsx`)
- **로그인**: `/login` (`src/pages/Login.tsx`)
- **공지사항**: `/notices` (`src/pages/Notices.tsx`)
- **회의록**: `/meetings` (`src/pages/Meetings.tsx`)
- **도면 관리**: `/drawings` (`src/pages/Drawings.tsx`)
- **자료실**: `/resources` (`src/pages/Resources.tsx`)
- **규정/지침**: `/regulations` (`src/pages/Regulations.tsx`)
- **관리자 설정**: `/admin` (`src/pages/Admin.tsx`)
- **권한 없음**: `/unauthorized` (`src/pages/Unauthorized.tsx`)

## 🔥 Firebase 설정
- **설정 파일**: `/firebase-applet-config.json` (프로젝트 자격 증명)
- **데이터 구조**: `/firebase-blueprint.json` (엔티티 및 Firestore 경로 정의)
- **보안 규칙**: `/firestore.rules` (Firestore 접근 제어 규칙)

## ✅ 현재 구현된 기능
- **인증 및 권한**: Google 로그인 연동, 허용된 사용자 목록(`allowedUsers`) 기반 접근 제어
- **실시간 동기화**: Firestore `onSnapshot`을 이용한 모든 데이터 실시간 업데이트
- **데이터 관리 (CRUD)**:
  - 공지사항, 회의록, 도면, 자료실 항목 생성 및 삭제 (권한별 차등)
  - 관리자 전용 사용자 추가/삭제 기능
- **UI/UX**:
  - 반응형 사이드바 레이아웃
  - Toast 알림 시스템
  - 로딩 상태 처리 및 에러 경계(Error Boundary)
  - Firestore 에러 핸들링 및 상세 로깅

## 🚧 미구현 또는 향후 과제
- **파일 업로드**: Firebase Storage 연동 (현재는 이미지/파일 URL 직접 입력 방식)
- **상세 편집**: 기존 항목(공지사항, 회의록 등)의 수정 기능 고도화
- **검색 및 필터**: 도면 및 자료의 카테고리별/키워드별 검색 기능
- **규정 뷰어**: PDF 또는 상세 문서 뷰어 연동

## 📦 주요 패키지 목록
- `firebase`: Firebase SDK (Auth, Firestore, Storage)
- `react-router-dom`: 클라이언트 사이드 라우팅
- `lucide-react`: 아이콘 라이브러리
- `motion`: 애니메이션 효과
- `clsx`, `tailwind-merge`: Tailwind 클래스 병합 유틸리티
- `date-fns`: 날짜 포맷팅
- `react-markdown`: 마크다운 렌더링
- `@google/genai`: Gemini AI 연동 SDK
