# Story 2.6: Confluence Page Link Transformation

**Issue:** #15
**Epic:** Epic 2 - Content Fidelity & Local Customization
**Status:** In Progress
**Agent Model Used:** Claude Sonnet 4.5

---

## Story

**As a** 플러그인 사용자,
**I want** Confluence 페이지 간 링크가 Obsidian 위키링크로 변환되고,
**so that** Obsidian에서 백링크와 그래프 뷰가 정상 작동한다.

---

## Acceptance Criteria

- [ ] AC1: Confluence 페이지 링크 감지
- [ ] AC2: 페이지 ID → 파일명 매핑 테이블 구축 (sync-history.json에 저장)
- [ ] AC3: Confluence 링크를 Obsidian 위키링크로 변환: [[파일명]]
- [ ] AC4: 링크된 페이지가 아직 동기화 안 된 경우 원본 URL 유지 및 TODO 주석 추가
- [ ] AC5: 외부 링크는 변환하지 않고 그대로 유지
- [ ] AC6: 단위 테스트: 링크 파싱 및 변환 로직 검증
- [ ] AC7: 통합 테스트: 링크된 두 페이지 동기화 후 그래프 뷰에서 연결 확인

---

## Tasks / Subtasks

### Task 1: PageLinkTransformer 모듈 구현 (AC: 1, 3, 4, 5)
- [ ] `src/converters/PageLinkTransformer.ts` 생성
  - [ ] `PageLinkTransformer` 클래스 구현
    - [ ] `extractPageLinks(html: string): Map<string, string>`
      - [ ] Confluence 페이지 링크 패턴 감지
      - [ ] 패턴: `/wiki/spaces/{spaceKey}/pages/{pageId}/...`
      - [ ] 페이지 ID 추출 및 URL 매핑
    - [ ] `transformLinks(markdown: string, pageIdToFileMap: Map<string, string>): string`
      - [ ] 마크다운 링크 `[text](url)` 파싱
      - [ ] 페이지 ID 기반 매칭
      - [ ] 위키링크로 변환: `[[파일명]]` 또는 `[[파일명|text]]`
      - [ ] 동기화 안 된 페이지: 원본 유지 + `<!-- TODO: Link to unsynced page -->`
      - [ ] 외부 링크: 변환하지 않음

### Task 2: SyncHistory 확장 (AC: 2)
- [ ] `src/sync/SyncHistory.ts` 수정
  - [ ] `pageIdToFileMap: Map<string, string>` 추가
  - [ ] `addPageMapping(pageId: string, filename: string): void`
  - [ ] `getFilenameByPageId(pageId: string): string | undefined`
  - [ ] `saveHistory()` - pageIdToFileMap 직렬화
  - [ ] `loadHistory()` - pageIdToFileMap 역직렬화

### Task 3: MarkdownConverter 수정 (AC: 3)
- [ ] `src/converters/MarkdownConverter.ts` 수정
  - [ ] PageLinkTransformer 통합
  - [ ] `convertPage()` 메서드에 링크 변환 추가
    - [ ] HTML 변환 전 Confluence 페이지 링크 추출
    - [ ] Markdown 변환 후 위키링크로 변환
    - [ ] SyncHistory의 pageIdToFileMap 사용

### Task 4: 단위 테스트 작성 (AC: 6)
- [ ] `test/unit/converters/PageLinkTransformer.test.ts` 생성
  - [ ] Confluence 링크 추출 테스트
  - [ ] 위키링크 변환 테스트
  - [ ] 동기화 안 된 페이지 처리 테스트
  - [ ] 외부 링크 유지 테스트
  - [ ] Edge case: 링크 없는 마크다운

### Task 5: 통합 테스트 작성 (AC: 7)
- [ ] `test/integration/page-link-sync.test.ts` 생성
  - [ ] 링크된 두 페이지 동기화 시나리오
  - [ ] 위키링크 생성 검증
  - [ ] 그래프 뷰 연결 검증 (수동)

---

## Dev Notes

### Confluence 페이지 링크 패턴
```
1. Full URL:
https://yoursite.atlassian.net/wiki/spaces/SPACE/pages/123456789/Page+Title

2. Relative URL:
/wiki/spaces/SPACE/pages/123456789/Page+Title

3. Short URL:
/wiki/pages/123456789

4. Anchor:
/wiki/spaces/SPACE/pages/123456789#anchor
```

### Obsidian 위키링크 형식
```markdown
[[파일명]]
[[파일명|표시 텍스트]]
[[폴더/파일명]]
```

### 변환 로직
```
1. HTML에서 Confluence 페이지 링크 추출
   - <a href="/wiki/spaces/SPACE/pages/123456789/...">text</a>
   - 페이지 ID: 123456789 추출

2. Turndown으로 Markdown 변환
   - [text](/wiki/spaces/SPACE/pages/123456789/...)

3. SyncHistory에서 페이지 ID → 파일명 조회
   - 123456789 → "page-title.md"

4. 위키링크로 변환
   - [text](/wiki/...) → [[page-title|text]]
   - 파일명만: [[page-title]]

5. 동기화 안 된 페이지
   - [text](/wiki/...) → [text](/wiki/...) <!-- TODO: Link to unsynced page -->
```

### SyncHistory 데이터 구조
```json
{
  "pages": {
    "123456789": {
      "id": "123456789",
      "title": "Page Title",
      "filename": "page-title.md",
      "lastSynced": "2025-11-22T10:00:00Z",
      "hash": "abc123"
    }
  },
  "pageIdToFileMap": {
    "123456789": "page-title.md",
    "987654321": "another-page.md"
  }
}
```

---

## Testing

### Unit Tests
- PageLinkTransformer 링크 파싱 및 변환
- SyncHistory 매핑 저장/로드

### Integration Tests
- 전체 동기화 흐름에서 위키링크 생성 확인

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
