# Story 1.4: Markdown Conversion & YAML Frontmatter

**Issue:** #7
**Epic:** Epic 1 - Foundation & Core Sync Infrastructure
**Status:** Ready for Review
**Agent Model Used:** Claude Sonnet 4.5

---

## Story

**As a** 플러그인 개발자,
**I want** Confluence 페이지의 HTML 콘텐츠를 마크다운으로 변환하고 메타데이터를 YAML Frontmatter로 생성하고,
**so that** Obsidian에서 읽을 수 있는 표준 마크다운 파일을 만들 수 있다.

---

## Acceptance Criteria

- [x] AC1: turndown 라이브러리 추가 및 HTML → Markdown 변환 모듈 작성 (markdown-converter.ts)
- [x] AC2: Confluence Storage Format HTML을 입력받아 마크다운 문자열 반환
- [x] AC3: YAML Frontmatter 생성 로직 구현 (metadata-builder.ts)
- [x] AC4: Frontmatter 필드: title, confluence_id, confluence_space, confluence_url, author, created, updated, tags
- [x] AC5: 변환된 마크다운과 Frontmatter를 결합한 최종 파일 콘텐츠 생성
- [x] AC6: 단위 테스트: 샘플 Confluence HTML → 마크다운 변환 검증
- [x] AC7: 단위 테스트: 메타데이터 객체 → YAML Frontmatter 문자열 검증

---

## Tasks / Subtasks

### Task 1: turndown 라이브러리 추가 (AC: 1)
- [x] `package.json`에 turndown ^7.2.0 의존성 추가
- [x] TypeScript 타입 정의 추가 (`@types/turndown`)
- [x] `npm install` 실행 및 확인

### Task 2: MarkdownConverter 모듈 구현 (AC: 1, 2)
- [x] `src/converters/MarkdownConverter.ts` 생성
  - [x] `MarkdownConverter` 클래스 구현
  - [x] `convertPage(page: ConfluencePage): Promise<string>` 메서드
  - [x] Turndown 인스턴스 초기화 및 옵션 설정
  - [x] Confluence Storage Format HTML → Markdown 변환
  - [x] 기본 변환 규칙 적용 (heading, list, table, code block 등)

### Task 3: MetadataBuilder 모듈 구현 (AC: 3, 4)
- [x] `src/converters/MetadataBuilder.ts` 생성
  - [x] `MetadataBuilder` 클래스 구현
  - [x] `buildFrontmatter(page: ConfluencePage): string` 메서드
  - [x] YAML Frontmatter 필드 생성:
    - [x] `title`: 페이지 제목
    - [x] `confluence_id`: Confluence 페이지 ID
    - [x] `confluence_space`: Space key
    - [x] `confluence_url`: 페이지 URL
    - [x] `author`: 작성자
    - [x] `created`: 생성 날짜
    - [x] `updated`: 마지막 수정 날짜
    - [x] `tags`: Confluence 라벨 배열
  - [x] js-yaml 라이브러리를 사용하여 YAML 문자열 생성

### Task 4: 파일 콘텐츠 결합 유틸리티 (AC: 5)
- [x] `src/converters/MetadataBuilder.ts`에 `combineContent()` 메서드 추가
  - [x] Frontmatter + Markdown 본문 결합
  - [x] 포맷: `---\n{frontmatter}\n---\n\n{markdown}\n`

### Task 5: 단위 테스트 작성 (AC: 6, 7)
- [x] `test/unit/converters/MarkdownConverter.test.ts` 생성
  - [x] Confluence HTML → Markdown 변환 성공 케이스
  - [x] 기본 HTML 요소 변환 (h1-h6, p, ul, ol, table, code)
  - [x] 빈 콘텐츠 처리
  - [x] 특수문자 이스케이프 검증
- [x] `test/unit/converters/MetadataBuilder.test.ts` 생성
  - [x] ConfluencePage → YAML Frontmatter 변환 성공 케이스
  - [x] 모든 필수 필드 존재 검증
  - [x] 빈 태그 배열 처리
  - [x] YAML 문법 유효성 검증
- [x] `test/fixtures/confluence-page-html.json` 생성
  - [x] 샘플 Confluence Storage Format HTML

---

## Dev Notes

### Architecture References

**MarkdownConverter Component** [Source: architecture.md#6.2]
- Responsibility: Convert Confluence Storage Format HTML to Obsidian Markdown
- Key Interfaces:
  - `convertPage(page: ConfluencePage): Promise<string>`
  - `extractPlantUML(html: string): PlantUMLBlock[]` (Future - Story 2.2)
  - `extractDrawio(html: string): DrawioBlock[]` (Future - Story 2.3)
- Dependencies: Turndown, LinkTransformer (Future - Story 2.1)
- Technology Stack: TypeScript, turndown ^7.2.0

**MetadataBuilder Component** [Source: architecture.md#6.3]
- Responsibility: Generate YAML Frontmatter metadata
- Key Interfaces:
  - `buildFrontmatter(page: ConfluencePage): string`
- Dependencies: js-yaml
- Technology Stack: TypeScript, js-yaml ^4.1.0

**FileFrontmatter Interface** [Source: architecture.md#4.4]
```typescript
interface FileFrontmatter {
  title: string;
  confluence_id: string;
  confluence_space: string;
  confluence_url: string;
  author: string;
  created: string;
  updated: string;
  tags: string[];
}
```

**Turndown Configuration** [Source: architecture.md#3]
- Library: turndown ^7.2.0
- Purpose: Confluence HTML → Markdown
- Default Rules: headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced'

**YAML Parser** [Source: architecture.md#3]
- Library: js-yaml ^4.1.0
- Purpose: Frontmatter parsing/generation
- Usage: `yaml.dump(frontmatterObject)`

### Project Structure [Source: architecture.md#12]
```
src/
├── converters/
│   ├── MarkdownConverter.ts    (신규 생성)
│   ├── MetadataBuilder.ts      (신규 생성)
│   └── strategies/             (Future - Story 2.x)
│       ├── PlantUMLStrategy.ts
│       └── DrawioStrategy.ts
```

### Testing Strategy [Source: architecture.md#16]
- Unit Tests: `test/unit/converters/`
- Mock Confluence Page: `test/fixtures/confluence-page-html.json`
- Coverage Goal: 90%+ (core conversion logic)

### Confluence Storage Format Notes
- Confluence uses XHTML-based Storage Format
- Common elements: `<h1>-<h6>`, `<p>`, `<ul>`, `<ol>`, `<table>`, `<code>`, `<pre>`
- Macros: `<ac:structured-macro>` (PlantUML, Draw.io) - Story 2.x에서 처리
- Links: `<ac:link>` (internal page links) - Story 2.1에서 처리

### Security Constraints [Source: architecture.md#17.1]
- Sanitize HTML to prevent XSS (Turndown handles this)
- Do not expose OAuth tokens in logs or frontmatter

### Dependencies to Add
```json
{
  "dependencies": {
    "turndown": "^7.2.0",
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "@types/turndown": "^5.0.4",
    "@types/js-yaml": "^4.0.9"
  }
}
```

---

## Dev Agent Record

### Agent Model Used
- Claude Sonnet 4.5

### Debug Log References
- None

### Completion Notes
- 모든 AC 완료 및 검증
- MarkdownConverter 구현: Turndown 기반 HTML → Markdown 변환
- MetadataBuilder 구현: YAML Frontmatter 생성 (8개 필드)
- 17개 단위 테스트 모두 통과 (100% pass rate)
- TypeScript 컴파일 및 빌드 성공
- Confluence code block, table, 특수문자 처리 확인
- YAML 문법 유효성 검증 완료

### File List
**Created:**
- `src/converters/MarkdownConverter.ts` - HTML → Markdown converter
- `src/converters/MetadataBuilder.ts` - YAML Frontmatter generator
- `test/unit/converters/MarkdownConverter.test.ts` - Markdown converter tests
- `test/unit/converters/MetadataBuilder.test.ts` - Metadata builder tests
- `test/fixtures/confluence-page-html.json` - Sample Confluence HTML fixture

**Modified:**
- `package.json` - Added @types/turndown, @types/js-yaml type definitions

**Deleted:**
- None

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-11-22 | 1.0 | Story file created | James (Dev) |
| 2025-11-22 | 2.0 | Story implementation completed - All tasks done, 17 tests passing, build successful | James (Dev) |
