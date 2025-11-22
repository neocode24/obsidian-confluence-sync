# Story 2.4: Draw.io Diagram Export

**Issue:** #13
**Epic:** Epic 2 - Content Fidelity & Local Customization
**Status:** In Progress
**Agent Model Used:** Claude Sonnet 4.5

---

## Story

**As a** 플러그인 사용자,
**I want** Confluence의 Draw.io 다이어그램이 .drawio 파일로 저장되고,
**so that** Obsidian Diagrams.net 플러그인으로 열어서 편집할 수 있다.

---

## Acceptance Criteria

- [x] AC1: Confluence Storage Format에서 Draw.io 매크로 감지
- [x] AC2: Draw.io XML 데이터 추출
- [x] AC3: 파일명: {페이지-slug}-diagram-{번호}.drawio로 저장
- [x] AC4: Vault의 attachments/ 폴더에 저장 (설정 가능)
- [x] AC5: 마크다운에 임베딩 코드 삽입: ![[diagram-file.drawio]]
- [ ] AC6: 첫 동기화 시 Obsidian Diagrams.net 플러그인 미설치 감지 → 설치 안내 (Optional - Skipped)
- [ ] AC7: 통합 테스트: Draw.io 포함 페이지 동기화 및 파일 생성 확인 (Deferred to E2E testing)

---

## Tasks / Subtasks

### Task 1: DrawioParser 모듈 구현 (AC: 1, 2)
- [ ] `src/converters/DrawioParser.ts` 생성
  - [ ] `DrawioMacro` 인터페이스 정의
    - [ ] `xml: string` - Draw.io XML 데이터
    - [ ] `name?: string` - 다이어그램 이름
    - [ ] `startIndex: number` - HTML 내 시작 위치
    - [ ] `endIndex: number` - HTML 내 끝 위치
  - [ ] `DrawioParser` 클래스 구현
    - [ ] `extractMacros(html: string): DrawioMacro[]`
      - [ ] `<ac:structured-macro ac:name="drawio">` 태그 감지
      - [ ] CDATA 섹션에서 Draw.io XML 추출
      - [ ] 매크로 위치 정보 저장
    - [ ] `generateFilename(pageSlug: string, index: number): string`
      - [ ] 형식: `{pageSlug}-diagram-{index}.drawio`
    - [ ] `replaceWithPlaceholders(html: string, macros: DrawioMacro[]): string`
      - [ ] 매크로를 플레이스홀더로 치환

### Task 2: FileManager 확장 (AC: 3, 4)
- [ ] `src/utils/FileManager.ts` 수정
  - [ ] `writeDrawioFile(filename: string, xml: string): Promise<void>`
    - [ ] attachments/ 폴더에 .drawio 파일 저장
    - [ ] 폴더 경로 설정 가능하도록 구현

### Task 3: MarkdownConverter 수정 (AC: 5)
- [ ] `src/converters/MarkdownConverter.ts` 수정
  - [ ] DrawioParser 통합
  - [ ] `convertPage()` 메서드 수정
    - [ ] HTML → Markdown 변환 전에 Draw.io 매크로 추출
    - [ ] FileManager를 통해 .drawio 파일 저장
    - [ ] 플레이스홀더를 `![[filename.drawio]]` 임베딩 코드로 복원

### Task 4: Plugin Detector 구현 (AC: 6)
- [ ] `src/utils/PluginDetector.ts` 생성 (if not exists)
  - [ ] `detectDiagramsNetPlugin(): boolean`
  - [ ] `showDiagramsNetInstallNotice(): void`
    - [ ] Notice: "Draw.io 다이어그램이 포함되어 있습니다. Obsidian Diagrams.net 플러그인 설치를 권장합니다."

### Task 5: 단위 테스트 작성
- [ ] `test/unit/converters/DrawioParser.test.ts` 생성
  - [ ] Draw.io 매크로 추출 테스트
  - [ ] CDATA XML 파싱 테스트
  - [ ] 파일명 생성 테스트
  - [ ] 여러 매크로 처리 테스트
  - [ ] Edge case: 매크로 없는 HTML

### Task 6: 통합 테스트 작성 (AC: 7)
- [ ] `test/integration/drawio-sync.test.ts` 생성
  - [ ] Draw.io 포함 페이지 전체 동기화 시나리오
  - [ ] .drawio 파일 생성 검증
  - [ ] 마크다운 임베딩 코드 검증

---

## Dev Notes

### Confluence Draw.io Macro Format
```xml
<ac:structured-macro ac:name="drawio" ac:schema-version="1">
  <ac:parameter ac:name="name">System Architecture</ac:parameter>
  <ac:plain-text-body>
    <![CDATA[
      <mxfile>
        <diagram>...</diagram>
      </mxfile>
    ]]>
  </ac:plain-text-body>
</ac:structured-macro>
```

### Obsidian Diagrams.net 임베딩
```markdown
![[system-architecture-diagram-0.drawio]]
```

### 변환 로직 흐름
```
1. Confluence HTML 수신
2. DrawioParser.extractMacros() - 매크로 추출
3. 각 매크로에서 XML 데이터 추출
4. FileManager.writeDrawioFile() - attachments/ 폴더에 .drawio 저장
5. 플레이스홀더로 매크로 치환
6. Turndown으로 HTML → Markdown 변환
7. 플레이스홀더를 ![[filename.drawio]] 임베딩 코드로 복원
8. 최종 마크다운 반환
```

---

## Testing

### Unit Tests
- DrawioParser 매크로 파싱
- 파일명 생성 로직
- FileManager .drawio 파일 쓰기

### Integration Tests
- 전체 동기화 흐름에서 Draw.io 파일 생성 확인
- 마크다운 임베딩 코드 검증

---

## Dev Agent Record

### File List
(To be populated during development)

### Debug Log References
(To be populated during development)

### Completion Notes
(To be populated during development)

### Change Log

#### 2025-11-22: Story 2.4 Implementation Complete
**Files Created:**
- `src/converters/DrawioParser.ts` - Draw.io macro parser with extraction and conversion logic (137 lines)
- `test/unit/converters/DrawioParser.test.ts` - 13 comprehensive unit tests

**Files Modified:**
- `src/utils/FileManager.ts` - Added `writeDrawioFile()` method for saving .drawio files
- `src/converters/MarkdownConverter.ts` - Integrated DrawioParser into conversion pipeline

**Implementation Notes:**
- Draw.io macros are extracted before Turndown conversion
- XML data is saved as .drawio files in `confluence/attachments/` folder
- Filename format: `{pageSlug}-diagram-{index}.drawio`
- Macros are replaced with `<p>__DRAWIO_PLACEHOLDER_N__</p>` tags
- Turndown escapes underscores to `\_\_DRAWIO\_PLACEHOLDER\_N\_\_`
- Placeholders are restored with Obsidian embedding syntax: `![[filename.drawio]]`
- Supports both CDATA and plain text Draw.io XML
- Optional name parameter from Confluence macro (currently not used in embedding)
- All 119 tests passing

**Acceptance Criteria Status:**
- AC1-AC5: ✅ Complete
- AC6: Skipped (optional plugin detection)
- AC7: Deferred to E2E testing phase
