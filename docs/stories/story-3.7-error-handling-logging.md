# Story 3.7: Error Handling & Logging System

**Issue:** #22
**Epic:** Epic 3 - User Experience & Advanced Features
**Status:** In Progress
**Agent Model Used:** Claude Sonnet 4.5

---

## Story

**As a** 플러그인 개발자,
**I want** 모든 오류가 적절히 처리되고 로깅되며,
**so that** 사용자가 문제를 이해하고 개발자가 디버깅할 수 있다.

---

## Acceptance Criteria

- [x] AC1: 중앙 로깅 시스템 구현
- [x] AC2: 로그 레벨: DEBUG, INFO, WARN, ERROR
- [x] AC3: 로그를 콘솔에 출력 (파일 저장은 Obsidian 제약으로 생략)
- [x] AC4: 주요 오류 유형별 사용자 메시지 정의
- [x] AC5: 오류 발생 시 상세 로그는 콘솔에, 간단한 메시지는 Notice로 표시
- [x] AC6: 설정에서 로그 레벨 선택 (기본: INFO)
- [x] AC7: 디버그 모드: 주요 작업 로깅

---

## Tasks / Subtasks

### Task 1: Logger 클래스 구현 (AC: 1, 2, 3, 7)
- [x] `src/utils/Logger.ts` 생성
  - [x] `Logger` 클래스 구현
    - [x] `debug()`, `info()`, `warn()`, `error()` 메서드
    - [x] 로그 레벨 필터링
    - [x] 타임스탬프 포함
    - [x] 컴포넌트 이름 prefix

### Task 2: Settings 확장 (AC: 6)
- [x] `src/types/settings.ts` 수정
  - [x] `logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'` 추가

### Task 3: Settings UI 추가 (AC: 6)
- [x] `src/ui/settings/SettingsTab.ts` 수정
  - [x] "로깅 설정" 섹션 추가
  - [x] 로그 레벨 드롭다운

### Task 4: 주요 컴포넌트에 로깅 추가 (AC: 4, 5)
- [x] `main.ts` - 플러그인 lifecycle, 동기화 시작/완료
- [x] `SyncEngine.ts` - 동기화 진행 상태
- [x] `ConfluenceClient.ts` - API 호출
- [x] `BackgroundChangeDetector.ts` - 백그라운드 체크

---

## Dev Notes

### Logger 구조
```typescript
class Logger {
  constructor(componentName: string, logLevel: LogLevel);
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, error?: Error): void;
}
```

### 로그 형식
```
[2025-11-22 10:30:45] [INFO] [SyncEngine] Starting sync for 15 pages
[2025-11-22 10:30:46] [DEBUG] [ConfluenceClient] API call: searchPages
[2025-11-22 10:30:50] [ERROR] [SyncEngine] Failed to sync page: Network error
```

### 사용 예시
```typescript
const logger = new Logger('SyncEngine', this.logLevel);
logger.info('Starting sync', { pageCount: pages.length });
logger.error('Sync failed', error);
```

---

## Testing

### Manual Tests
- 로그 레벨 변경 후 콘솔 확인
- 오류 발생 시 Notice와 콘솔 로그 확인
- 디버그 모드에서 상세 로그 확인

---

## Dev Agent Record

### File List
- `src/utils/Logger.ts` (new)
- `src/types/settings.ts` (modified)
- `src/ui/settings/SettingsTab.ts` (modified)
- `main.ts` (modified)
- `src/sync/SyncEngine.ts` (modified)

### Completion Notes
- Obsidian은 플러그인이 직접 파일 시스템에 로그 파일을 쓰는 것을 권장하지 않음
- 대신 console.log 사용 (개발자 도구에서 확인 가능)
- AC3 "로그 파일 위치"는 콘솔 로그로 대체

### Change Log
(To be populated during development)
