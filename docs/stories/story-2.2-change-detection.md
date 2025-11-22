# Story 2.2: Change Detection with Timestamp Comparison

**Issue:** #11
**Epic:** Epic 2 - Bidirectional Sync & Conflict Resolution
**Status:** In Progress
**Agent Model Used:** Claude Sonnet 4.5

---

## Story

**As a** 플러그인 사용자,
**I want** 변경된 Confluence 페이지만 업데이트되고,
**so that** 불필요한 파일 재작성을 피하고 동기화 속도를 높인다.

---

## Acceptance Criteria

- [x] AC1: 동기화 이력 파일(sync-history.json)에 페이지별 마지막 동기화 타임스탬프 저장
- [x] AC2: Confluence API의 lastModified 필드와 로컬 타임스탬프 비교
- [x] AC3: lastModified가 더 최신이면 페이지 업데이트 실행
- [x] AC4: 변경 없는 페이지는 스킵하고 로그에 기록
- [x] AC5: 동기화 완료 후 sync-history.json 업데이트
- [x] AC6: 설정 UI에 "강제 전체 동기화" 옵션 추가 (타임스탬프 무시)
- [x] AC7: 단위 테스트: 타임스탬프 비교 로직 검증

---

## Tasks / Subtasks

### Task 1: SyncHistory 모듈 구현 (AC: 1, 5)
- [x] `src/sync/SyncHistory.ts` 생성
  - [x] `SyncHistoryRecord` 인터페이스 정의
    - [x] `pageId: string`
    - [x] `lastSyncedAt: string (ISO 8601)`
    - [x] `lastModified: string`
    - [x] `filePath: string`
  - [x] `SyncHistory` 클래스 구현
    - [x] `loadHistory(): Promise<Map<string, SyncHistoryRecord>>`
    - [x] `saveHistory(records: Map<string, SyncHistoryRecord>): Promise<void>`
    - [x] `getRecord(pageId: string): SyncHistoryRecord | undefined`
    - [x] `updateRecord(pageId: string, record: SyncHistoryRecord): void`
    - [x] `clearHistory(): Promise<void>`
  - [x] `.obsidian/plugins/confluence-sync/sync-history.json` 파일 경로 정의

### Task 2: ChangeDetector 모듈 구현 (AC: 2, 3, 4)
- [x] `src/sync/ChangeDetector.ts` 생성
  - [x] `ChangeDetector` 클래스 구현
    - [x] `needsUpdate(page: ConfluencePage, history: SyncHistoryRecord | undefined): boolean`
      - [x] 이력이 없으면 true (신규 페이지)
      - [x] lastModified 비교 로직
      - [x] 강제 동기화 옵션 처리
    - [x] `filterChangedPages(pages: ConfluencePage[], forceSync: boolean): Promise<ConfluencePage[]>`

### Task 3: SyncEngine 수정 - 변경 감지 통합 (AC: 3, 4, 5)
- [x] `src/sync/SyncEngine.ts` 수정
  - [x] SyncHistory, ChangeDetector 통합
  - [x] `syncAll()` 메서드 수정
    - [x] 동기화 전 이력 로드
    - [x] 변경된 페이지만 필터링
    - [x] 스킵된 페이지 로그 출력
    - [x] 동기화 후 이력 업데이트
  - [x] 통계 정보 추가
    - [x] `totalPages: number`
    - [x] `updatedPages: number`
    - [x] `skippedPages: number`

### Task 4: 설정 UI 수정 - 강제 전체 동기화 옵션 (AC: 6)
- [x] `src/types/settings.ts` 수정
  - [x] `forceFullSync: boolean` 필드 추가 (기본값: false)
- [x] `src/ui/settings/SettingsTab.ts` 수정
  - [x] "강제 전체 동기화" 토글 추가
  - [x] 설명: "모든 페이지를 다시 동기화 (변경 여부 무시)"

### Task 5: 단위 테스트 작성 (AC: 7)
- [x] `test/unit/sync/SyncHistory.test.ts` 생성 (13 tests)
  - [x] 이력 로드/저장 테스트
  - [x] 레코드 조회/업데이트 테스트
  - [x] 이력 초기화 테스트
- [x] `test/unit/sync/ChangeDetector.test.ts` 생성 (9 tests)
  - [x] 신규 페이지 감지 테스트
  - [x] 변경된 페이지 감지 테스트
  - [x] 변경 없는 페이지 스킵 테스트
  - [x] 강제 동기화 옵션 테스트

### Task 6: 통합 테스트 작성
- [ ] `test/integration/change-detection.test.ts` 생성
  - [ ] 첫 동기화 시나리오 (모든 페이지 신규)
  - [ ] 재동기화 시나리오 (변경 페이지만 업데이트)
  - [ ] 강제 전체 동기화 시나리오

---

## Dev Notes

### SyncHistory 파일 구조
```json
{
  "12345": {
    "pageId": "12345",
    "lastSyncedAt": "2025-11-22T10:00:00Z",
    "lastModified": "2025-11-22T09:30:00Z",
    "filePath": "confluence/test-page.md"
  },
  "67890": {
    "pageId": "67890",
    "lastSyncedAt": "2025-11-22T10:00:00Z",
    "lastModified": "2025-11-22T09:45:00Z",
    "filePath": "confluence/another-page.md"
  }
}
```

### 타임스탬프 비교 로직
```typescript
function needsUpdate(page: ConfluencePage, record?: SyncHistoryRecord): boolean {
  // 강제 동기화 옵션이 켜져 있으면 무조건 업데이트
  if (this.settings.forceFullSync) {
    return true;
  }

  // 이력이 없으면 신규 페이지
  if (!record) {
    return true;
  }

  // Confluence lastModified가 로컬 lastModified보다 최신이면 업데이트
  return new Date(page.lastModified) > new Date(record.lastModified);
}
```

### 동기화 흐름
```
1. SyncHistory 로드
2. Confluence API로 페이지 목록 조회
3. ChangeDetector로 변경된 페이지 필터링
4. 변경된 페이지만 파일로 저장
5. SyncHistory 업데이트 및 저장
6. 통계 출력 (전체 / 업데이트 / 스킵)
```

---

## Testing

### Unit Tests
- SyncHistory 파일 I/O
- ChangeDetector 비교 로직

### Integration Tests
- 전체 동기화 흐름에서 변경 감지 동작 확인

---

## Dev Agent Record

### File List
(To be populated during development)

### Debug Log References
(To be populated during development)

### Completion Notes
(To be populated during development)

### Change Log
(To be populated during development)
