# Story 3.2: Filter Logic Implementation

**Issue:** #17
**Epic:** Epic 3 - User Experience & Advanced Features
**Status:** In Progress
**Agent Model Used:** Claude Sonnet 4.5

---

## Story

**As a** 플러그인 개발자,
**I want** 사용자가 설정한 필터를 CQL 쿼리로 변환하고,
**so that** Confluence API 호출 시 필터링된 페이지만 조회한다.

---

## Acceptance Criteria

- [x] AC1: 필터 조건 → CQL 쿼리 변환 로직 구현
- [x] AC2: 복합 필터 지원 (Space AND Label)
- [x] AC3: 필터 없음 시 기본 쿼리: `type = page`
- [x] AC4: CQL 쿼리 빌더 모듈 작성 (`CQLBuilder.ts`)
- [x] AC5: 단위 테스트 - 다양한 필터 조합 → CQL 쿼리 검증
- [ ] AC6: 통합 테스트 - 필터 적용 후 예상 페이지만 조회 확인 (E2E 테스트로 대체)
- [x] AC7: 오류 처리 - 잘못된 필터 입력 시 안전한 쿼리 생성

---

## Tasks / Subtasks

### Task 1: CQLBuilder 모듈 구현 (AC: 1, 2, 3, 4)
- [x] `src/utils/CQLBuilder.ts` 생성
  - [x] `CQLBuilder` 클래스 구현
    - [x] `buildSearchQuery(filters?: SyncFilters): string`
      - [x] 기본 쿼리: `type = page`
      - [x] Space 필터: `space IN (SPACE1, SPACE2)`
      - [x] Label 필터: `label IN (label1, label2)`
      - [x] Page Tree 필터: `ancestor IN (pageId1, pageId2)`
      - [x] 복합 필터: AND 연산자로 조합
    - [x] `escapeValue(value: string): string` - CQL 특수문자 이스케이프
    - [x] `validateFilters(filters: SyncFilters): boolean` - 필터 유효성 검증

### Task 2: ConfluenceClient 통합 (AC: 1)
- [x] `src/api/ConfluenceClient.ts` 수정 (또는 sync 로직)
  - [x] CQLBuilder import
  - [x] `searchPages()` 메서드에 CQL 쿼리 적용
  - [x] 필터 설정을 CQL로 변환하여 MCP API 호출

### Task 3: 단위 테스트 작성 (AC: 5, 7)
- [x] `test/unit/utils/CQLBuilder.test.ts` 생성
  - [x] 필터 없음 → 기본 쿼리 테스트
  - [x] Space 필터만 → CQL 쿼리 테스트
  - [x] Label 필터만 → CQL 쿼리 테스트
  - [x] Page Tree 필터만 → CQL 쿼리 테스트
  - [x] 복합 필터 (Space + Label) → CQL 쿼리 테스트
  - [x] 특수문자 이스케이프 테스트
  - [x] 빈 필터 배열 처리 테스트

---

## Dev Notes

### CQL 쿼리 형식

```
기본 쿼리:
type = page

Space 필터:
type = page AND space IN (SPACE1, SPACE2)

Label 필터:
type = page AND label IN (important, documentation)

Page Tree 필터:
type = page AND ancestor IN (123456789, 987654321)

복합 필터 (Space + Label):
type = page AND space IN (SPACE1, SPACE2) AND label IN (important, documentation)

모든 필터:
type = page AND space IN (SPACE1) AND label IN (important) AND ancestor IN (123456789)
```

### CQL 특수문자 이스케이프
```typescript
// CQL에서 특수문자 이스케이프가 필요한 경우
// 공백, 쉼표 등은 이미 trim 처리되므로 기본적으로 안전
// 필요시 따옴표로 감싸기: "value with spaces"
```

### MCP API 호출
```typescript
// Atlassian MCP - searchConfluenceUsingCql
await mcp_atlassian.searchConfluenceUsingCql({
  cloudId: tenant.cloudId,
  cql: "type = page AND space IN (SPACE1, SPACE2)",
  limit: 100
});
```

---

## Testing

### Unit Tests
- CQLBuilder 쿼리 생성 로직
- 필터 유효성 검증
- 특수문자 처리

### Manual Tests
- 설정에서 필터 설정 후 동기화 실행
- 예상 페이지만 동기화되는지 확인
- 필터 비활성화 시 모든 페이지 동기화 확인

---

## Dev Agent Record

### File List
- `src/utils/CQLBuilder.ts` (new)
- `src/api/ConfluenceClient.ts` (modified) 또는 sync logic
- `test/unit/utils/CQLBuilder.test.ts` (new)

### Debug Log References
(To be populated during development)

### Completion Notes
(To be populated during development)

### Change Log
(To be populated during development)
