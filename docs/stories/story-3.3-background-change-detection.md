# Story 3.3: Background Change Detection Scheduler

**Issue:** #18
**Epic:** Epic 3 - User Experience & Advanced Features
**Status:** In Progress
**Agent Model Used:** Claude Sonnet 4.5

---

## Story

**As a** 플러그인 사용자,
**I want** Obsidian 시작 시 백그라운드에서 Confluence 변경사항을 자동 체크하고,
**so that** 수동으로 확인하지 않아도 최신 상태를 알 수 있다.

---

## Acceptance Criteria

- [x] AC1: Obsidian 플러그인 로드 시 백그라운드 체크 스케줄러 시작
- [x] AC2: 설정에서 체크 빈도 설정 (기본: Obsidian 시작 시 1회)
- [x] AC3: 백그라운드 체크 - Confluence API에서 페이지 lastModified 조회
- [x] AC4: 로컬 sync-history.json과 비교하여 변경된 페이지 감지
- [x] AC5: 변경 감지 시 알림 표시
- [x] AC6: 체크 중 네트워크 오류 시 조용히 실패 (사용자 방해 금지)
- [x] AC7: 설정에서 "백그라운드 체크 비활성화" 옵션 제공

---

## Tasks / Subtasks

### Task 1: Settings 확장 (AC: 2, 7)
- [x] `src/types/settings.ts` 수정
  - [x] `backgroundCheck: boolean` 추가 (기본값: true)
  - [x] `backgroundCheckOnStartup: boolean` 추가 (기본값: true)

### Task 2: Settings UI 추가 (AC: 2, 7)
- [x] `src/ui/settings/SettingsTab.ts` 수정
  - [x] "백그라운드 변경 감지" 섹션 추가
  - [x] "백그라운드 체크 활성화" 토글
  - [x] "시작 시 자동 체크" 토글

### Task 3: BackgroundChangeDetector 구현 (AC: 3, 4, 5, 6)
- [x] `src/sync/BackgroundChangeDetector.ts` 생성
  - [x] `BackgroundChangeDetector` 클래스
    - [x] `checkForChanges(): Promise<number>` - 변경된 페이지 개수 반환
    - [x] Confluence API로 페이지 목록 조회 (최소 데이터만)
    - [x] SyncHistory와 lastModified 비교
    - [x] 변경 감지 시 알림 표시
    - [x] 네트워크 오류 조용히 처리

### Task 4: Plugin Lifecycle 통합 (AC: 1, 2)
- [x] `main.ts` 수정
  - [x] `onload()` - 백그라운드 체크 시작 (설정에 따라)
  - [x] `onunload()` - 정리 작업
  - [x] 시작 시 자동 체크 실행

---

## Dev Notes

### Settings 데이터 구조
```typescript
interface PluginSettings {
  // ... existing fields
  backgroundCheck: boolean;          // 백그라운드 체크 활성화
  backgroundCheckOnStartup: boolean; // 시작 시 자동 체크
}
```

### BackgroundChangeDetector 흐름
```
1. checkForChanges() 호출
2. ConfluenceClient로 페이지 목록 조회 (CQL 쿼리 사용)
3. SyncHistory 로드
4. 각 페이지의 lastModified 비교
   - Confluence lastModified > Local lastModified → 변경됨
5. 변경된 페이지 개수 반환
6. 알림 표시 (변경 있을 경우만)
```

### 알림 형식
```
"📢 Confluence에 3개의 변경된 페이지가 있습니다."
```

### 오류 처리
- 네트워크 오류: console.log만 (알림 없음)
- OAuth 토큰 만료: 조용히 실패
- MCP 연결 오류: console.log만

---

## Testing

### Manual Tests
- Obsidian 시작 시 백그라운드 체크 실행 확인
- 변경된 페이지 있을 때 알림 표시 확인
- 네트워크 오류 시 조용히 실패 확인
- 설정 토글 동작 확인

---

## Dev Agent Record

### File List
- `src/types/settings.ts` (modified)
- `src/ui/settings/SettingsTab.ts` (modified)
- `src/sync/BackgroundChangeDetector.ts` (new)
- `main.ts` (modified)

### Debug Log References
(To be populated during development)

### Completion Notes
(To be populated during development)

### Change Log
(To be populated during development)
