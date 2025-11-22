# Story 1.3: Fetch User's Confluence Pages

**Issue:** #6
**Epic:** Epic 1 - Foundation & Core Sync Infrastructure
**Status:** Ready for Review
**Agent Model Used:** Claude Sonnet 4.5

---

## Story

**As a** 플러그인 사용자,
**I want** 내가 작성한 Confluence 페이지 목록을 조회하고,
**so that** 어떤 페이지들이 동기화 대상인지 확인할 수 있다.

---

## Acceptance Criteria

- [x] AC1: Confluence REST API 클라이언트 모듈 작성 (confluence-client.ts)
- [x] AC2: CQL 쿼리 구현: creator = currentUser() 로 내가 작성한 페이지만 필터링
- [x] AC3: API 호출 시 MCP OAuth 토큰을 Authorization 헤더에 포함
- [x] AC4: 페이지 목록 응답 파싱 (페이지 ID, 제목, Space, lastModified, author 추출)
- [x] AC5: API 호출 실패 시 적절한 오류 처리 (네트워크 오류, 인증 오류, 권한 오류)
- [x] AC6: 페이지 목록을 콘솔 로그에 출력하여 개발 단계에서 확인 가능
- [x] AC7: 단위 테스트: Mock API 응답으로 페이지 파싱 검증

---

## Tasks / Subtasks

### Task 1: Confluence API 데이터 모델 정의 (AC: 4)
- [x] `src/types/confluence.ts` 생성
  - [x] `ConfluencePage` interface 정의 (id, title, spaceKey, content, version, lastModified, author, url, labels, parentId, attachments)
  - [x] `Attachment` interface 정의 (id, title, mediaType, fileSize, downloadUrl, pageId)
  - [x] `PageSearchResult` interface 정의 (results, cursor, hasMore)

### Task 2: ConfluenceClient에 searchPages 메서드 구현 (AC: 1, 2, 3, 4)
- [x] `src/api/ConfluenceClient.ts` 수정
  - [x] `searchPages(cql: string, limit?: number): Promise<ConfluencePage[]>` 메서드 추가
  - [x] CQL 기본값: `creator = currentUser() AND type = page`
  - [x] Confluence REST API v2 `/wiki/api/v2/search` 엔드포인트 호출
  - [x] Query parameters: `cql`, `limit` (default: 50), `expand=body.storage,version,metadata.labels`
  - [x] MCP Client를 통한 API 호출 (OAuth 토큰 자동 포함)
  - [x] API 응답을 `ConfluencePage[]`로 파싱

### Task 3: 오류 처리 구현 (AC: 5)
- [x] `src/types/errors.ts` 생성 (없으면)
  - [x] `NetworkError` 클래스 정의 (extends ConfluenceSyncError)
  - [x] `OAuthError` 클래스 정의 (extends ConfluenceSyncError)
  - [x] `ConfluenceAPIError` 클래스 정의 (statusCode, message 포함)
- [x] ConfluenceClient에 에러 핸들링 추가
  - [x] HTTP 401: OAuthError 발생
  - [x] HTTP 403: PermissionError 발생
  - [x] HTTP 400: CQL 쿼리 오류 처리
  - [x] Network timeout/connection errors: NetworkError 발생

### Task 4: 개발용 콘솔 로그 출력 (AC: 6)
- [x] `src/api/ConfluenceClient.ts` 수정
  - [x] searchPages 결과를 console.log로 출력
  - [x] 페이지 개수, 각 페이지의 ID, 제목, Space 출력
  - [x] 로그 포맷: `[Confluence] Found X pages: [{id: ..., title: ..., space: ...}, ...]`

### Task 5: 단위 테스트 작성 (AC: 7)
- [x] `test/unit/api/ConfluenceClient.test.ts` 생성
  - [x] Mock Obsidian API 생성
  - [x] searchPages 성공 케이스 테스트 (Mock API 응답 파싱 검증)
  - [x] searchPages CQL 커스텀 쿼리 테스트
  - [x] 401 Unauthorized 에러 처리 테스트
  - [x] 403 Forbidden 에러 처리 테스트
  - [x] Network error 처리 테스트
  - [x] 빈 결과 처리 테스트
  - [x] 비페이지 타입 필터링 테스트
  - [x] 누락 필드 graceful 처리 테스트

---

## Dev Notes

### Architecture References

**Data Models** [Source: architecture.md#4]
- `ConfluencePage` interface 정의 (Section 4.1):
  ```typescript
  interface ConfluencePage {
    id: string;
    title: string;
    spaceKey: string;
    content: string;
    version: number;
    lastModified: string;
    author: string;
    url: string;
    labels: string[];
    parentId?: string;
    attachments?: Attachment[];
  }
  ```

- `Attachment` interface 정의 (Section 4.2):
  ```typescript
  interface Attachment {
    id: string;
    title: string;
    mediaType: string;
    fileSize: number;
    downloadUrl: string;
    pageId: string;
  }
  ```

**API Specifications** [Source: architecture.md#5.1]
- Base URL: `https://{tenant}.atlassian.net/wiki/api/v2/`
- Authentication: OAuth 2.0 Bearer Token (MCP 관리)
- Headers:
  ```http
  Authorization: Bearer {oauth_token}
  Content-Type: application/json
  Accept: application/json
  ```

**Search Pages Endpoint** [Source: architecture.md#5.1.1]
- Endpoint: `GET /wiki/api/v2/search`
- Query Parameters:
  - `cql` (required): CQL query string (기본값: `creator = currentUser() AND type = page`)
  - `limit` (optional): 결과 개수 (default: 25, max: 100)
  - `cursor` (optional): 페이지네이션 커서
  - `expand` (optional): 확장 필드 (예: `body.storage,version,metadata.labels`)
- Error Responses:
  - `401 Unauthorized`: OAuth 토큰 만료 또는 무효
  - `403 Forbidden`: 권한 부족
  - `400 Bad Request`: CQL 문법 오류

**MCP Client Interface** [Source: architecture.md#5.2]
```typescript
interface MCPClient {
  initiateOAuth(tenantUrl: string): Promise<string>;
  exchangeToken(authCode: string): Promise<OAuthToken>;
  refreshToken(refreshToken: string): Promise<OAuthToken>;
  request<T>(endpoint: string, options?: RequestOptions): Promise<T>;
}
```

**ConfluenceClient Component** [Source: architecture.md#6.1]
- Responsibility: Confluence API 호출 및 OAuth 관리 (MCP 경유)
- Key Interfaces:
  - `searchPages(cql: string): Promise<ConfluencePage[]>`
  - `getPage(pageId: string): Promise<ConfluencePage>`
  - `getAttachments(pageId: string): Promise<Attachment[]>`
  - `downloadAttachment(pageId: string, filename: string): Promise<Blob>`
- Dependencies: MCPClient (external SDK)
- Technology Stack: TypeScript, @modelcontextprotocol/sdk

**Error Handling** [Source: architecture.md#18.1]
- Error Class Hierarchy:
  ```typescript
  export class ConfluenceSyncError extends Error {
    constructor(
      message: string,
      public code: string,
      public details?: any,
      public recoverable: boolean = false
    ) {
      super(message);
    }
  }

  export class MCPConnectionError extends ConfluenceSyncError { }
  export class OAuthError extends ConfluenceSyncError { }
  export class NetworkError extends ConfluenceSyncError { }
  ```

**Rate Limit Handling** [Source: architecture.md#18.1.1]
- Confluence API Rate Limits: 1000-5000 requests/hour (tenant tier 의존)
- HTTP 429 응답 시 `RateLimitError` 발생
- Response Headers:
  - `X-RateLimit-Limit`: 총 허용 요청 수
  - `X-RateLimit-Remaining`: 남은 요청 수
  - `Retry-After`: 재시도 대기 시간 (초)

### Project Structure Notes [Source: architecture.md#12]
- API 클라이언트 위치: `src/api/ConfluenceClient.ts` (이미 존재)
- 타입 정의 위치: `src/types/confluence.ts` (신규 생성)
- 에러 클래스 위치: `src/types/errors.ts` (신규 생성)
- 테스트 파일 위치: `test/unit/api/ConfluenceClient.test.ts` (신규 생성)

### Previous Story Insights [Source: story-1.2-mcp-oauth-integration.md]
- ConfluenceClient는 이미 MCP SDK 초기화 및 OAuth 처리 완료
- `src/api/ConfluenceClient.ts` 파일 존재
- MCP Client는 `@modelcontextprotocol/sdk` 사용
- OAuth 토큰은 MCP에서 자동 관리 (플러그인이 직접 저장하지 않음)
- Story 1.2에서 Task 4 (Token Refresh), Task 5 (Testing) 미완료 상태이지만 Story 1.3 진행에 영향 없음

### Security Constraints [Source: architecture.md#17.1]
- **OAuth via MCP Only**: API Key, Personal Access Token 사용 금지
- **Never Store Tokens**: OAuth 토큰을 data.json, sync-history.json, 로그에 절대 저장 금지
- **Logging Sanitization**: 로그에 토큰, API Key, 비밀번호 출력 금지

### Testing

**Testing Strategy** [Source: architecture.md#16]
- Test Framework: Vitest ^1.0.0
- Test Organization:
  - Unit Tests: `test/unit/` (70% 비율 목표)
  - Integration Tests: `test/integration/` (25% 비율 목표)
  - Mocks: `test/mocks/`
- Coverage Goals:
  - Overall: 80%+
  - Core logic (API, converters, sync): 90%+

**Unit Test Requirements** [Source: architecture.md#16.2]
- Mock MCP Client 사용 (`test/mocks/MCPClientMock.ts`)
- API 응답 fixture 사용 (`test/fixtures/`)
- 성공 케이스 + 에러 케이스 모두 테스트
- CQL 쿼리 파라미터 검증
- 응답 파싱 정확성 검증

**Test File Location**
- `test/unit/api/ConfluenceClient.test.ts`
- Mock 파일: `test/mocks/MCPClientMock.ts` (신규 생성 필요)
- Fixture 파일: `test/fixtures/confluence-search-response.json` (신규 생성 필요)

---

## Dev Agent Record

### Agent Model Used
- Claude Sonnet 4.5

### Debug Log References
- None

### Completion Notes
- 모든 AC 완료 및 검증
- 13개 단위 테스트 모두 통과 (100% pass rate)
- TypeScript 컴파일 및 빌드 성공
- Confluence API v2 search endpoint 구현 완료
- 포괄적인 에러 처리 (401, 403, 400, 429, network errors)
- Console logging으로 개발 중 페이지 조회 확인 가능

### File List
**Created:**
- `src/types/confluence.ts` - Confluence API 데이터 모델 (ConfluencePage, Attachment, PageSearchResult)
- `src/types/errors.ts` - 에러 클래스 계층 (ConfluenceSyncError, MCPConnectionError, OAuthError, NetworkError, ConfluenceAPIError, PermissionError, RateLimitError, PageConversionError, FileWriteError)
- `test/unit/api/ConfluenceClient.test.ts` - ConfluenceClient.searchPages 단위 테스트 (13 tests)
- `test/mocks/obsidian.ts` - Obsidian API mock for testing
- `test/fixtures/confluence-search-response.json` - Mock API response fixture
- `vitest.config.ts` - Vitest 테스트 설정

**Modified:**
- `src/api/ConfluenceClient.ts` - searchPages(), parseSearchResults() 메서드 추가 및 에러 클래스 import 업데이트
- `src/ui/settings/SettingsTab.ts` - 에러 클래스 import 경로 수정 (types/errors.ts에서 가져오기)
- `package.json` - Vitest 의존성 및 test 스크립트 추가 (test, test:watch, test:coverage)
- `tsconfig.json` - resolveJsonModule, allowSyntheticDefaultImports, esModuleInterop 옵션 추가

**Deleted:**
- None

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-11-22 | 1.0 | Story file created | James (Dev) |
| 2025-11-22 | 2.0 | Story implementation completed - All tasks done, 13 tests passing, build successful | James (Dev) |
