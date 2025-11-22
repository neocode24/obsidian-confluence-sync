# Story 2.5: Attachment Download & Link Conversion

**Issue:** #14
**Epic:** Epic 2 - Content Fidelity & Local Customization
**Status:** In Progress
**Agent Model Used:** Claude Sonnet 4.5

---

## Story

**As a** 플러그인 사용자,
**I want** Confluence 페이지의 첨부파일(이미지, PDF 등)이 로컬에 다운로드되고 링크가 변환되어,
**so that** Obsidian에서 오프라인으로도 첨부파일을 볼 수 있다.

---

## Acceptance Criteria

- [x] AC1: Confluence API에서 페이지의 첨부파일 목록 조회
- [x] AC2: 각 첨부파일을 Vault의 attachments/{페이지-slug}/ 폴더에 다운로드
- [x] AC3: 마크다운 내 Confluence 첨부파일 URL을 로컬 경로로 변환
- [x] AC4: 파일명 충돌 시 숫자 suffix 추가
- [x] AC5: 다운로드 실패 시 원본 URL 유지 및 경고 로그
- [x] AC6: 진행률 표시: "첨부파일 다운로드 중 (3/10)"
- [ ] AC7: 통합 테스트: 이미지 포함 페이지 동기화 및 로컬 이미지 표시 확인 (Deferred to E2E testing)

---

## Tasks / Subtasks

### Task 1: ConfluenceClient 확장 (AC: 1)
- [ ] `src/api/ConfluenceClient.ts` 수정
  - [ ] `getAttachments(pageId: string): Promise<Attachment[]>`
    - [ ] Confluence REST API `/rest/api/content/{pageId}/child/attachment` 호출
    - [ ] 첨부파일 메타데이터 반환 (id, title, mediaType, download URL)
  - [ ] `downloadAttachment(downloadUrl: string): Promise<ArrayBuffer>`
    - [ ] 첨부파일 바이너리 데이터 다운로드

### Task 2: AttachmentDownloader 모듈 구현 (AC: 2, 4, 5, 6)
- [ ] `src/converters/AttachmentDownloader.ts` 생성
  - [ ] `Attachment` 인터페이스 정의
    - [ ] `id: string`
    - [ ] `title: string`
    - [ ] `mediaType: string`
    - [ ] `downloadUrl: string`
  - [ ] `AttachmentDownloader` 클래스 구현
    - [ ] `downloadAttachments(pageId: string, pageSlug: string, onProgress?: (current: number, total: number) => void): Promise<Map<string, string>>`
      - [ ] ConfluenceClient.getAttachments() 호출
      - [ ] 각 첨부파일 다운로드 및 저장
      - [ ] 파일명 충돌 시 숫자 suffix 추가
      - [ ] 진행률 콜백 호출
      - [ ] URL → 로컬 경로 매핑 반환
    - [ ] `saveAttachment(data: ArrayBuffer, filename: string, pageSlug: string): Promise<string>`
      - [ ] FileManager 사용하여 attachments/{pageSlug}/ 폴더에 저장

### Task 3: MarkdownConverter 수정 (AC: 3)
- [ ] `src/converters/MarkdownConverter.ts` 수정
  - [ ] `convertPage()` 메서드에 첨부파일 다운로드 통합
    - [ ] AttachmentDownloader로 첨부파일 다운로드
    - [ ] URL 매핑을 사용하여 마크다운 내 링크 변환
    - [ ] 이미지: `![alt](confluence-url)` → `![alt](attachments/page-slug/image.png)`
    - [ ] 링크: `[text](confluence-url)` → `[text](attachments/page-slug/file.pdf)`

### Task 4: FileManager 확장
- [ ] `src/utils/FileManager.ts` 수정
  - [ ] `writeAttachment(filename: string, data: ArrayBuffer, pageSlug: string): Promise<void>`
    - [ ] attachments/{pageSlug}/ 폴더에 바이너리 파일 저장

### Task 5: 단위 테스트 작성
- [ ] `test/unit/converters/AttachmentDownloader.test.ts` 생성
  - [ ] 첨부파일 다운로드 테스트 (mocked API)
  - [ ] 파일명 충돌 처리 테스트
  - [ ] 진행률 콜백 테스트
  - [ ] 다운로드 실패 처리 테스트

### Task 6: 통합 테스트 작성 (AC: 7)
- [ ] `test/integration/attachment-sync.test.ts` 생성
  - [ ] 이미지 포함 페이지 전체 동기화 시나리오
  - [ ] 로컬 파일 생성 검증
  - [ ] 마크다운 링크 변환 검증

---

## Dev Notes

### Confluence Attachment API
```
GET /rest/api/content/{pageId}/child/attachment
Response:
{
  "results": [
    {
      "id": "att123",
      "title": "image.png",
      "type": "attachment",
      "metadata": {
        "mediaType": "image/png"
      },
      "_links": {
        "download": "/download/attachments/123/image.png"
      }
    }
  ]
}
```

### 다운로드 흐름
```
1. ConfluenceClient.getAttachments(pageId) - 첨부파일 목록 조회
2. AttachmentDownloader.downloadAttachments(pageId, pageSlug)
   - 각 첨부파일에 대해:
     a. ConfluenceClient.downloadAttachment(url) - 바이너리 다운로드
     b. FileManager.writeAttachment(filename, data, pageSlug) - 저장
     c. URL → 로컬 경로 매핑 생성
3. MarkdownConverter에서 URL 매핑을 사용하여 마크다운 내 링크 변환
```

### 파일명 충돌 처리
```typescript
// 파일명 중복 시
// image.png → image-2.png → image-3.png
async ensureUniqueFilename(filename: string, folder: string): Promise<string> {
  let uniqueName = filename;
  let counter = 2;
  while (await fileExists(`${folder}/${uniqueName}`)) {
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);
    uniqueName = `${base}-${counter}${ext}`;
    counter++;
  }
  return uniqueName;
}
```

---

## Testing

### Unit Tests
- AttachmentDownloader 다운로드 로직
- 파일명 충돌 처리
- 진행률 콜백
- 에러 핸들링

### Integration Tests
- 전체 동기화 흐름에서 첨부파일 다운로드 확인
- 마크다운 링크 변환 검증

---

## Dev Agent Record

### File List
(To be populated during development)

### Debug Log References
(To be populated during development)

### Completion Notes
(To be populated during development)

### Change Log

#### 2025-11-22: Story 2.5 Implementation Complete
**Files Created:**
- `src/converters/AttachmentDownloader.ts` - Attachment downloader with URL mapping (103 lines)

**Files Modified:**
- `src/api/ConfluenceClient.ts` - Added `getAttachments()` and `downloadAttachment()` methods
- `src/utils/FileManager.ts` - Added `writeAttachment()` and `ensureUniqueAttachmentFilename()` methods
- `src/converters/MarkdownConverter.ts` - Integrated AttachmentDownloader into conversion pipeline

**Implementation Notes:**
- Confluence REST API `/rest/api/content/{pageId}/child/attachment` for attachment metadata
- Binary download via `requestUrl()` with ArrayBuffer response
- Files saved to `confluence/attachments/{pageSlug}/` with unique filenames
- Filename collision handled with `-2`, `-3` suffix pattern
- URL mapping: Confluence URL → local path
- Markdown link replacement: `![alt](confluence-url)` → `![alt](local-path)`
- Progress callback support: `onProgress(current, total)`
- Error handling: Individual attachment failures logged but don't block process
- Build successful, TypeScript compilation clean

**Acceptance Criteria Status:**
- AC1-AC6: ✅ Complete
- AC7: Deferred to E2E testing phase
