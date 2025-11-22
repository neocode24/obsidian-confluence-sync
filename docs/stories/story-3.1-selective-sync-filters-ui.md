# Story 3.1: Selective Sync Filters UI

**Issue:** #16
**Epic:** Epic 3 - User Experience & Advanced Features
**Status:** In Progress
**Agent Model Used:** Claude Sonnet 4.5

---

## Story

**As a** 플러그인 사용자,
**I want** 설정에서 동기화 대상을 필터링할 수 있고,
**so that** 특정 Space나 Label이 붙은 페이지만 동기화하여 불필요한 데이터를 제외할 수 있다.

---

## Acceptance Criteria

- [x] AC1: 설정 UI에 필터 섹션 추가
- [x] AC2: Space 필터 - 다중 선택 드롭다운 (체크박스)
- [x] AC3: Label 필터 - 쉼표로 구분된 텍스트 입력
- [x] AC4: 페이지 트리 필터 - 특정 페이지 ID 입력
- [x] AC5: "필터 없음 (모든 페이지)" 옵션
- [x] AC6: 설정 저장 시 Plugin Data에 저장
- [ ] AC7: 동기화 실행 시 필터 조건을 CQL 쿼리에 반영 (Story 3.2에서 구현)

---

## Tasks / Subtasks

### Task 1: SyncFilters 데이터 모델 구현 (AC: 6)
- [x] `src/types/filters.ts` 생성
  - [x] `SyncFilters` 인터페이스 정의
    - [x] `spaceKeys: string[]` - 선택된 Space 키 목록
    - [x] `labels: string[]` - 필터링할 레이블 목록
    - [x] `rootPageIds: string[]` - 페이지 트리 필터용 루트 페이지 ID
    - [x] `enabled: boolean` - 필터 활성화 여부

### Task 2: 설정 UI 확장 (AC: 1, 2, 3, 4, 5)
- [x] `src/settings/ConfluenceSettingsTab.ts` 수정
  - [x] 필터 섹션 추가 (`<h3>Sync Filters</h3>`)
  - [x] "Enable Filters" 토글 추가
  - [x] Space 필터 UI
    - [x] Available Spaces 조회 (MCP API)
    - [x] 다중 선택 체크박스 리스트
  - [x] Label 필터 UI
    - [x] 텍스트 입력 (쉼표 구분)
    - [x] Placeholder: "label1, label2, label3"
  - [x] 페이지 트리 필터 UI
    - [x] 텍스트 입력 (쉼표 구분)
    - [x] Placeholder: "123456789, 987654321"
    - [x] 설명: "루트 페이지 ID와 그 하위 페이지만 동기화"
  - [x] "필터 없음" 안내 메시지

### Task 3: ConfluenceSettings 확장 (AC: 6)
- [x] `src/types/settings.ts` 수정
  - [x] `ConfluenceSettings` 인터페이스에 `filters?: SyncFilters` 추가
  - [x] `DEFAULT_SETTINGS`에 기본값 추가

### Task 4: Plugin Data 저장/로드 (AC: 6)
- [x] `main.ts` 수정
  - [x] `loadSettings()` - 필터 설정 로드
  - [x] `saveSettings()` - 필터 설정 저장

---

## Dev Notes

### SyncFilters 데이터 구조
```typescript
interface SyncFilters {
  enabled: boolean;          // 필터 활성화 여부
  spaceKeys: string[];       // ["SPACE1", "SPACE2"]
  labels: string[];          // ["important", "documentation"]
  rootPageIds: string[];     // ["123456789", "987654321"]
}
```

### 저장 형식 (data.json)
```json
{
  "mcpServerName": "atlassian",
  "targetFolder": "confluence",
  "filters": {
    "enabled": true,
    "spaceKeys": ["SPACE1", "SPACE2"],
    "labels": ["important", "documentation"],
    "rootPageIds": ["123456789"]
  }
}
```

### UI 레이아웃
```
┌─ Sync Filters ───────────────────────────┐
│ ☑ Enable Filters                         │
│                                           │
│ Space Filter:                             │
│ ☑ SPACE1 - Space Name 1                  │
│ ☐ SPACE2 - Space Name 2                  │
│ ☑ SPACE3 - Space Name 3                  │
│                                           │
│ Label Filter:                             │
│ [important, documentation            ]    │
│ (쉼표로 구분)                             │
│                                           │
│ Page Tree Filter:                         │
│ [123456789, 987654321                ]    │
│ (루트 페이지 ID, 쉼표로 구분)            │
│ ℹ 지정된 페이지와 하위 페이지만 동기화  │
└───────────────────────────────────────────┘
```

### Space 조회 API
```typescript
// MCP atlassian 서버 사용
const spaces = await mcp_atlassian.getConfluenceSpaces({
  cloudId: this.settings.cloudId,
  limit: 250
});
```

---

## Testing

### Manual Tests
- 설정 UI에서 필터 옵션 표시 확인
- Space 목록 로드 확인
- 필터 저장 및 재로드 확인
- "Enable Filters" 토글 동작 확인

---

## Dev Agent Record

### File List
- `src/types/filters.ts` (new)
- `src/types/settings.ts` (modified)
- `src/settings/ConfluenceSettingsTab.ts` (modified)
- `main.ts` (modified)

### Debug Log References
(To be populated during development)

### Completion Notes
(To be populated during development)

### Change Log
(To be populated during development)
