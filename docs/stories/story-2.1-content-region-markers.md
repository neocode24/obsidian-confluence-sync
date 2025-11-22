# Story 2.1: Content Region Separation Markers

**Issue:** #10
**Epic:** Epic 2 - Bidirectional Sync & Conflict Resolution
**Status:** Draft
**Agent Model Used:** Claude Sonnet 4.5

---

## Story

**As a** 플러그인 사용자,
**I want** 동기화된 파일이 Confluence 원본 영역과 내 로컬 메모 영역으로 명확히 구분되어 있고,
**so that** 로컬에서 추가한 백링크나 태그가 재동기화 시에도 보존된다.

---

## Acceptance Criteria

- [x] AC1: 파일 저장 시 콘텐츠 영역 분리 마커 삽입
- [x] AC2: 재동기화 시 기존 파일 읽기 및 마커 감지
- [x] AC3: 마커 사이의 Confluence 원본 영역만 업데이트
- [x] AC4: 마커 이후의 로컬 메모 영역은 절대 수정하지 않음
- [x] AC5: 신규 파일 생성 시 로컬 메모 영역 템플릿 자동 추가
- [x] AC6: 단위 테스트: 기존 파일 파싱 및 영역 분리 로직 검증
- [x] AC7: 통합 테스트: 재동기화 후 로컬 메모 보존 확인

---

## Tasks / Subtasks

### Task 1: ContentRegionParser 모듈 구현 (AC: 2, 3, 4)
- [x] `src/utils/ContentRegionParser.ts` 생성
  - [x] `parseFileContent(content: string)` 함수 구현
    - [x] Confluence 영역 마커 감지
    - [x] 로컬 메모 영역 추출
    - [x] 반환: `{ confluenceContent: string, localNotes: string }`
  - [x] 마커 상수 정의
    - [x] `CONFLUENCE_START_MARKER`
    - [x] `CONFLUENCE_END_MARKER`

### Task 2: FileManager 수정 - 영역 분리 저장 (AC: 1, 3, 4, 5)
- [x] `src/utils/FileManager.ts` 수정
  - [x] `writeFile()` 메서드 수정
    - [x] 기존 파일 존재 시 ContentRegionParser 호출
    - [x] 로컬 메모 영역 보존
    - [x] 새로운 Confluence 콘텐츠로 교체
  - [x] 신규 파일 생성 시 로컬 메모 템플릿 추가
    - [x] 마커로 영역 구분
    - [x] 로컬 메모 섹션 템플릿 (`## Local Notes`, `## Backlinks`)

### Task 3: MetadataBuilder 수정 - 마커 포함 콘텐츠 생성 (AC: 1)
- [x] `src/utils/MetadataBuilder.ts` 수정
  - [x] `combineContent()` 메서드 수정
    - [x] Frontmatter 이후 Confluence 영역 마커 추가
    - [x] 콘텐츠를 마커로 감싸기

### Task 4: 단위 테스트 작성 (AC: 6)
- [x] `test/unit/utils/ContentRegionParser.test.ts` 생성
  - [x] 마커가 있는 파일 파싱 테스트
  - [x] 마커가 없는 파일 처리 테스트
  - [x] 빈 로컬 메모 영역 테스트
  - [x] Edge case: 불완전한 마커
- [x] `test/unit/utils/FileManager.test.ts` 수정
  - [x] 기존 파일 업데이트 시 로컬 메모 보존 테스트
  - [x] 신규 파일 생성 시 템플릿 추가 테스트

### Task 5: 통합 테스트 작성 (AC: 7)
- [x] `test/integration/content-region-preservation.test.ts` 생성
  - [x] 재동기화 시나리오: 로컬 메모 보존 확인
  - [x] 신규 파일 + 재동기화 시나리오

---

## Dev Notes

### 콘텐츠 영역 마커 형식
```markdown
<!-- CONFLUENCE_START -->
[Confluence 원본 콘텐츠]
<!-- CONFLUENCE_END -->

## Local Notes
[사용자가 추가한 로컬 메모]

## Backlinks
- [[관련 페이지 1]]
- [[관련 페이지 2]]
```

### 파일 구조 예시
```markdown
---
title: Example Page
confluence_id: '12345'
---

<!-- CONFLUENCE_START -->
# Example Page

Original Confluence content here...
<!-- CONFLUENCE_END -->

## Local Notes
- My personal thoughts
- TODO items

## Backlinks
- [[Related Note 1]]
- [[Project Overview]]
```

---

## Testing

### Unit Tests
- ContentRegionParser 파싱 로직
- FileManager 영역 분리 저장

### Integration Tests
- 재동기화 후 로컬 메모 보존

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
