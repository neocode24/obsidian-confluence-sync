# Story 1.5: File Naming with Slug & Save to Disk

**Issue:** #8
**Epic:** Epic 1 - Foundation & Core Sync Infrastructure
**Status:** Ready for Review
**Agent Model Used:** Claude Sonnet 4.5

---

## Story

**As a** 플러그인 사용자,
**I want** Confluence 페이지가 URL-safe한 파일명으로 Obsidian vault에 저장되고,
**so that** 파일명 충돌 없이 모든 플랫폼에서 파일에 접근할 수 있다.

---

## Acceptance Criteria

- [ ] AC1: slugify 라이브러리를 사용하여 페이지 제목을 URL-safe 파일명으로 변환 (slug.ts)
- [ ] AC2: 파일명 규칙: {slug}.md (예: api-설계-가이드.md)
- [ ] AC3: 파일명 중복 시 숫자 suffix 추가 (예: api-설계-가이드-2.md)
- [ ] AC4: Obsidian Vault API를 사용하여 파일 저장 (file-manager.ts)
- [ ] AC5: 저장 경로는 설정 가능하도록 설정 UI에 필드 추가 (기본값: confluence/)
- [ ] AC6: 파일 저장 성공 시 Notice로 사용자에게 알림 표시
- [ ] AC7: 파일 쓰기 실패 시 오류 메시지 표시 및 롤백

---

## Tasks / Subtasks

### Task 1: Slug 생성 유틸리티 구현 (AC: 1, 2)
- [ ] `src/utils/slug.ts` 생성
  - [ ] `generateSlug(title: string): string` 함수 구현
  - [ ] slugify 라이브러리 사용 (한글, 특수문자 처리)
  - [ ] 파일명 규칙: {slug}.md
  - [ ] 최대 길이 제한 (255자)

### Task 2: FileManager 모듈 구현 (AC: 3, 4, 7)
- [ ] `src/utils/FileManager.ts` 생성
  - [ ] `FileManager` 클래스 구현
  - [ ] `writeFile(filePath: string, content: string): Promise<void>` 메서드
  - [ ] `ensureUniqueFileName(fileName: string, folderPath: string): Promise<string>` 메서드
  - [ ] `fileExists(filePath: string): Promise<boolean>` 메서드
  - [ ] Obsidian Vault API 사용
  - [ ] 파일명 중복 처리 (숫자 suffix 추가)
  - [ ] 에러 처리 및 FileWriteError 발생

### Task 3: 설정 UI에 저장 경로 필드 추가 (AC: 5)
- [ ] `src/types/settings.ts` 수정
  - [ ] `syncPath: string` 필드 추가 (기본값: "confluence/")
- [ ] `src/ui/settings/SettingsTab.ts` 수정
  - [ ] 저장 경로 입력 필드 추가
  - [ ] 폴더 경로 유효성 검사

### Task 4: 알림 처리 (AC: 6, 7)
- [ ] FileManager에 Notice 통합
  - [ ] 파일 저장 성공 시 Notice 표시
  - [ ] 파일 쓰기 실패 시 에러 Notice 표시

### Task 5: 단위 테스트 작성
- [ ] `test/unit/utils/slug.test.ts` 생성
  - [ ] generateSlug 성공 케이스
  - [ ] 한글 제목 처리
  - [ ] 특수문자 제거
  - [ ] 긴 제목 자르기
- [ ] `test/unit/utils/FileManager.test.ts` 생성
  - [ ] writeFile 성공 케이스
  - [ ] 파일명 중복 처리
  - [ ] 에러 처리

---

## Dev Notes

### Architecture References

**FileManager Component** [Source: architecture.md#6.4]
- Responsibility: Obsidian Vault file system operations (Repository pattern)
- Key Interfaces:
  - `writeFile(filePath: string, content: string): Promise<void>`
  - `readFile(filePath: string): Promise<string>`
  - `generateSlug(title: string): string`
- Dependencies: Obsidian Vault API, slugify
- Technology Stack: TypeScript, Obsidian API, slugify ^1.6.6

**Slug Generation** [Source: architecture.md#3]
- Library: slugify ^1.6.6
- Purpose: URL-safe filename generation
- Configuration:
  ```typescript
  slugify(title, {
    lower: true,
    strict: true,
    locale: 'ko',
    remove: /[*+~.()'"!:@]/g
  })
  ```

**PluginSettings** [Source: architecture.md#4.5]
```typescript
interface PluginSettings {
  syncPath: string; // Default: "confluence/"
  attachmentsPath: string; // Default: "attachments/"
  // ... other fields
}
```

**Error Handling** [Source: architecture.md#18.1]
- FileWriteError: Thrown when file write fails
- Error should include file path and reason

### Obsidian Vault API

```typescript
// Obsidian Vault API 주요 메서드
interface Vault {
  create(path: string, data: string): Promise<TFile>;
  modify(file: TFile, data: string): Promise<void>;
  read(file: TFile): Promise<string>;
  exists(path: string): Promise<boolean>;
  getAbstractFileByPath(path: string): TAbstractFile | null;
  createFolder(path: string): Promise<void>;
}
```

### File Naming Strategy
- 기본 경로: `{syncPath}/{slug}.md`
- 예시: `confluence/api-설계-가이드.md`
- 중복 시: `confluence/api-설계-가이드-2.md`
- 최대 파일명 길이: 255자 (파일시스템 제약)

### Security Constraints [Source: architecture.md#17.1]
- Path traversal 공격 방지 (../ 체크)
- 파일명에 위험한 문자 제거

### Testing Strategy
- Unit Tests: slug 생성, 파일명 중복 처리
- Mock Obsidian Vault API
- Coverage Goal: 90%+

---

## Dev Agent Record

### Agent Model Used
- Claude Sonnet 4.5

### Debug Log References
- None

### Completion Notes
- (업데이트 예정)

### File List
**Created:**
- `src/utils/slug.ts` - Slug generation utility
- `src/utils/FileManager.ts` - File operations manager
- `test/unit/utils/slug.test.ts` - Slug tests
- `test/unit/utils/FileManager.test.ts` - FileManager tests

**Modified:**
- `src/types/settings.ts` - Added syncPath field
- `src/ui/settings/SettingsTab.ts` - Added sync path input

**Deleted:**
- None

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-11-22 | 1.0 | Story file created | James (Dev) |
