# Confluence-Obsidian Sync Product Requirements Document (PRD)

## Goals and Background Context

### Goals

- Confluence에 파편화된 개인 지식을 Obsidian으로 통합하여 단일 진실 공급원(Single Source of Truth) 구축
- 폴더 트리 구조의 한계를 극복하고 네트워크 기반 지식 그래프(온톨로지) 구현
- Confluence → Obsidian 단방향 동기화 자동화로 재작성 낭비 제거
- 모든 기기(Mac, iPad, iPhone)에서 일관된 지식 접근 환경 제공
- 데이터 무결성 보장 (PlantUML, Draw.io 원본 형식 보존)

### Background Context

현재 개인 지식 관리가 Obsidian(로컬), Confluence(회사 다중 테넌트), MWeb(모바일 뷰어) 등 여러 곳에 파편화되어 있으며, 같은 내용을 중복 작성하거나 동기화가 안 되는 문제가 발생하고 있습니다. 특히 폴더 트리 구조는 깊이 3-4단계부터 탐색과 정리가 어려워 지식의 다차원적 관계를 표현하지 못하는 한계가 있습니다.

이 프로젝트는 Obsidian을 중심으로 iCloud 기반 지식 저장소를 구축하고, Confluence의 내 작성 콘텐츠를 OAuth 기반 MCP를 통해 단방향 동기화하여, 백링크와 메타데이터 기반의 온톨로지 지식 그래프를 실현합니다. TypeScript 기반 Obsidian 플러그인으로 구현하여 사용자가 필요한 시점에 동기화를 실행하며, 백그라운드 변경 감지와 알림으로 최신 상태를 유지합니다.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-11-22 | v0.1 | 초기 PRD 작성 | John (PM) |

---

## Requirements

### Functional Requirements

**FR1:** 플러그인은 MCP OAuth를 통해 Confluence API에 접근하여 현재 사용자가 작성한 페이지만 조회할 수 있어야 함 (CQL: creator = currentUser())

**FR2:** 사용자는 동기화 대상을 선택적으로 필터링할 수 있어야 함 (테넌트, Space, 특정 페이지 하위 트리, Label 기준)

**FR3:** Confluence 페이지 콘텐츠를 Obsidian 호환 마크다운으로 변환하여 저장해야 함

**FR4:** 각 파일의 YAML Frontmatter에 메타데이터를 저장해야 함 (confluence_id, confluence_space, confluence_url, author, created, updated, tags 등)

**FR5:** 파일명은 Slug화된 URL-safe 형식으로 생성되어야 함 (예: `api-설계-가이드.md`)

**FR6:** 동기화된 파일은 Confluence 원본 영역과 로컬 메모 영역으로 분리되어야 하며, 재동기화 시 로컬 메모 영역은 보존되어야 함

**FR7:** PlantUML 매크로는 코드 블록 형태로 원본 보존되어야 함

**FR8:** Draw.io 다이어그램은 `.drawio` 파일로 저장되어야 함

**FR9:** 첨부파일(이미지, PDF 등)을 다운로드하여 로컬에 저장하고 마크다운 링크를 변환해야 함

**FR10:** Confluence 페이지 간 링크를 Obsidian 위키링크 형식(`[[파일명]]`)으로 변환해야 함

**FR11:** 변경 감지는 Confluence의 `lastModified` 타임스탬프와 로컬 메타데이터를 비교하여 수행되어야 함

**FR12:** Obsidian 시작 시 백그라운드에서 Confluence 변경사항을 체크하고 알림을 표시해야 함

**FR13:** 알림에는 "지금 동기화" 및 "나중에" 액션 버튼이 포함되어야 함

**FR14:** 사용자는 Obsidian 명령 팔레트(Cmd+P)에서 수동으로 동기화를 실행할 수 있어야 함

**FR15:** 다중 Confluence 테넌트를 관리할 수 있어야 함 (테넌트별 OAuth 설정)

### Non-Functional Requirements

**NFR1:** 플러그인은 TypeScript로 개발되어야 하며 Obsidian Plugin API를 준수해야 함

**NFR2:** OAuth 인증은 보안 정책을 준수하여 API Key 방식을 사용하지 않아야 함

**NFR3:** 데이터 손실 없이 원본 형식을 최대한 보존해야 함 (PlantUML, Draw.io)

**NFR4:** 파일명은 크로스 플랫폼 호환성을 위해 특수문자를 제외한 URL-safe 형식이어야 함

**NFR5:** 동기화 작업은 사용자에게 진행 상황을 표시해야 함 (프로그레스 바 또는 상태 메시지)

**NFR6:** 로컬 메모 영역은 재동기화 시에도 절대 덮어쓰지 않아야 함 (데이터 보호)

**NFR7:** iCloud 동기화 충돌을 방지하기 위해 파일 쓰기 작업은 원자적(atomic)으로 수행되어야 함

**NFR8:** 플러그인은 Obsidian PlantUML 및 Diagrams.net 플러그인 설치를 권장해야 함 (첫 실행 시 안내)

---

## Technical Assumptions

### Repository Structure: Monorepo

- **결정:** 단일 저장소 (Monorepo)
- **근거:** Obsidian 플러그인 프로젝트는 단일 플러그인으로 구성되며, 추가 마이크로서비스나 별도 백엔드가 없음. 플러그인 코드, 문서, 테스트가 한 곳에 있는 것이 관리 효율적.

### Service Architecture

- **아키텍처:** Client-side Monolith (Obsidian Plugin)
- **근거:**
  - 모든 로직이 Obsidian 플러그인 내부에서 실행됨
  - 서버 컴포넌트 없음 (Confluence API는 외부 서비스)
  - MCP 서버는 별도 프로세스로 이미 구성됨 (Atlassian MCP)
- **주요 컴포넌트:**
  - Confluence API Client (MCP 연동)
  - Markdown Converter
  - File Manager (저장, 슬러그 변환)
  - Metadata Manager (YAML Frontmatter)
  - Sync Engine (변경 감지, 동기화 로직)
  - Settings UI (필터, 테넌트 관리)
  - Notification Handler (백그라운드 체크, 알림)

### Testing Requirements

- **테스트 전략:** Unit + Integration Testing
- **근거:**
  - 플러그인의 핵심 로직(마크다운 변환, 메타데이터 생성, 파일명 슬러그화)은 단위 테스트 필수
  - Confluence API 연동은 Mock 기반 통합 테스트 필요
  - E2E 테스트는 Obsidian 환경 구성 복잡도로 인해 Phase 2로 연기
- **테스트 범위:**
  - Unit: Markdown converter, Slug generator, Metadata builder
  - Integration: MCP client mock, File I/O operations
  - Manual: 실제 Confluence 연동, UI/UX 검증

### Additional Technical Assumptions and Requests

**언어 및 런타임:**
- TypeScript 4.9+ (Obsidian Plugin API 호환)
- Node.js 18+ (개발 환경)
- esbuild (번들러)

**핵심 라이브러리:**
- `obsidian` - Obsidian Plugin API
- `turndown` 또는 유사 라이브러리 - HTML → Markdown 변환
- `slugify` - URL-safe 파일명 생성
- `js-yaml` - YAML Frontmatter 파싱/생성

**MCP 연동:**
- Atlassian MCP 서버 (OAuth 기반)
- MCP Client SDK (플러그인 내 통합)

**파일 구조:**
```
obsidian-confluence-sync/
├─ src/
│  ├─ main.ts              # 플러그인 엔트리
│  ├─ settings.ts          # 설정 UI
│  ├─ sync/
│  │  ├─ confluence-client.ts
│  │  ├─ sync-engine.ts
│  │  └─ change-detector.ts
│  ├─ converters/
│  │  ├─ markdown-converter.ts
│  │  ├─ metadata-builder.ts
│  │  └─ link-transformer.ts
│  ├─ utils/
│  │  ├─ slug.ts
│  │  └─ file-manager.ts
│  └─ ui/
│     ├─ notification.ts
│     └─ progress-modal.ts
├─ test/
├─ docs/
├─ manifest.json
├─ package.json
└─ tsconfig.json
```

**배포:**
- Obsidian Community Plugins 제출 (MVP 안정화 후)
- 초기에는 수동 설치 (GitHub Release)

**개발 환경:**
- VS Code (TypeScript 개발)
- Obsidian Hot Reload Plugin (개발 편의성)

**데이터 저장:**
- 동기화 이력: JSON 파일 (`.obsidian/plugins/confluence-sync/sync-history.json`)
- 설정: Obsidian Plugin Data API 사용

**성능 고려:**
- 초기 대량 동기화 시 배치 처리 (페이지 10개씩)
- 파일 쓰기는 비동기 처리 (Promise.all)

---

## Epic List

### Epic 1: Foundation & Core Sync Infrastructure
**Goal:** Obsidian 플러그인 기본 구조를 수립하고, MCP OAuth 연동을 통해 Confluence에서 내가 작성한 페이지를 조회하여 기본 마크다운으로 변환 후 저장하는 MVP를 완성한다.

### Epic 2: Content Fidelity & Local Customization
**Goal:** 데이터 무결성을 보장하기 위해 PlantUML/Draw.io 원본 형식을 보존하고, 콘텐츠 영역 분리를 통해 로컬 메모/백링크를 안전하게 유지하며, 첨부파일과 페이지 링크 변환을 완성한다.

### Epic 3: User Experience & Advanced Features
**Goal:** 선택적 동기화 필터, 백그라운드 변경 감지, 알림 UI, 다중 테넌트 관리 등 사용자 편의 기능을 추가하여 실제 일상 사용이 가능한 완성도 높은 플러그인으로 발전시킨다.

---

## Epic 1: Foundation & Core Sync Infrastructure

**Epic Goal:**
Obsidian 플러그인 프로젝트 구조를 수립하고, Git 저장소 초기화, CI/CD 기본 설정, MCP OAuth 인증을 통한 Confluence API 연동을 완성한다. 내가 작성한 Confluence 페이지를 조회하여 기본 마크다운으로 변환 후 YAML Frontmatter 메타데이터와 함께 Slug 파일명으로 저장하는 최소 동기화 기능을 구현한다. 이를 통해 사용자는 명령 팔레트에서 "Confluence 동기화"를 실행하여 첫 번째 페이지를 Obsidian에 가져올 수 있다.

### Story 1.1: Project Initialization & Repository Setup

**As a** developer,
**I want** Obsidian 플러그인 프로젝트 구조와 Git 저장소가 초기화되어 있고,
**so that** 개발을 시작할 수 있고 코드 버전 관리가 가능하다.

**Acceptance Criteria:**
1. Obsidian 플러그인 샘플 템플릿 기반 프로젝트 생성 (manifest.json, main.ts, package.json 포함)
2. Git 저장소 초기화 및 .gitignore 설정 (node_modules, .obsidian 제외)
3. TypeScript 설정 (tsconfig.json) 및 esbuild 번들러 구성
4. README.md 작성 (프로젝트 개요, 설치 방법, 개발 가이드)
5. npm install 실행 시 모든 의존성 설치 성공
6. npm run dev 실행 시 플러그인이 Obsidian에서 로드됨 (Hello World 수준)
7. GitHub 저장소 생성 및 초기 커밋 푸시

### Story 1.2: MCP OAuth Integration

**As a** 플러그인 사용자,
**I want** MCP를 통해 OAuth 인증으로 Confluence에 안전하게 접근하고,
**so that** API Key 없이 보안 정책을 준수하며 내 Confluence 데이터에 접근할 수 있다.

**Acceptance Criteria:**
1. MCP Client SDK 의존성 추가 및 초기화 코드 작성
2. 설정 UI에서 Confluence 테넌트 URL 입력 필드 추가
3. "Confluence 연결" 버튼 클릭 시 MCP OAuth 플로우 시작
4. OAuth 인증 성공 시 액세스 토큰을 Obsidian Plugin Data에 안전하게 저장
5. 인증 실패 시 사용자에게 오류 메시지 표시
6. 토큰 만료 시 자동 갱신 로직 구현
7. 설정 UI에서 연결 상태 표시 (연결됨/연결 안 됨)

### Story 1.3: Fetch User's Confluence Pages

**As a** 플러그인 사용자,
**I want** 내가 작성한 Confluence 페이지 목록을 조회하고,
**so that** 어떤 페이지들이 동기화 대상인지 확인할 수 있다.

**Acceptance Criteria:**
1. Confluence REST API 클라이언트 모듈 작성 (confluence-client.ts)
2. CQL 쿼리 구현: `creator = currentUser()` 로 내가 작성한 페이지만 필터링
3. API 호출 시 MCP OAuth 토큰을 Authorization 헤더에 포함
4. 페이지 목록 응답 파싱 (페이지 ID, 제목, Space, lastModified, author 추출)
5. API 호출 실패 시 적절한 오류 처리 (네트워크 오류, 인증 오류, 권한 오류)
6. 페이지 목록을 콘솔 로그에 출력하여 개발 단계에서 확인 가능
7. 단위 테스트: Mock API 응답으로 페이지 파싱 검증

### Story 1.4: Markdown Conversion & YAML Frontmatter

**As a** 플러그인 개발자,
**I want** Confluence 페이지의 HTML 콘텐츠를 마크다운으로 변환하고 메타데이터를 YAML Frontmatter로 생성하고,
**so that** Obsidian에서 읽을 수 있는 표준 마크다운 파일을 만들 수 있다.

**Acceptance Criteria:**
1. `turndown` 라이브러리 추가 및 HTML → Markdown 변환 모듈 작성 (markdown-converter.ts)
2. Confluence Storage Format HTML을 입력받아 마크다운 문자열 반환
3. YAML Frontmatter 생성 로직 구현 (metadata-builder.ts)
4. Frontmatter 필드: title, confluence_id, confluence_space, confluence_url, author, created, updated, tags
5. 변환된 마크다운과 Frontmatter를 결합한 최종 파일 콘텐츠 생성
6. 단위 테스트: 샘플 Confluence HTML → 마크다운 변환 검증
7. 단위 테스트: 메타데이터 객체 → YAML Frontmatter 문자열 검증

### Story 1.5: File Naming with Slug & Save to Disk

**As a** 플러그인 사용자,
**I want** Confluence 페이지가 URL-safe한 파일명으로 Obsidian vault에 저장되고,
**so that** 파일명 충돌 없이 모든 플랫폼에서 파일에 접근할 수 있다.

**Acceptance Criteria:**
1. `slugify` 라이브러리를 사용하여 페이지 제목을 URL-safe 파일명으로 변환 (slug.ts)
2. 파일명 규칙: `{slug}.md` (예: `api-설계-가이드.md`)
3. 파일명 중복 시 숫자 suffix 추가 (예: `api-설계-가이드-2.md`)
4. Obsidian Vault API를 사용하여 파일 저장 (file-manager.ts)
5. 저장 경로는 설정 가능하도록 설정 UI에 필드 추가 (기본값: `confluence/`)
6. 파일 저장 성공 시 Notice로 사용자에게 알림 표시
7. 파일 쓰기 실패 시 오류 메시지 표시 및 롤백

### Story 1.6: Manual Sync Command

**As a** 플러그인 사용자,
**I want** 명령 팔레트에서 "Confluence 동기화" 명령을 실행하여 수동으로 동기화를 시작하고,
**so that** 원할 때 Confluence 페이지를 Obsidian으로 가져올 수 있다.

**Acceptance Criteria:**
1. Obsidian Command 등록: "Sync Confluence Pages"
2. 명령 실행 시 진행 상황을 Modal 또는 Notice로 표시 (progress-modal.ts)
3. 동기화 로직: Confluence 페이지 조회 → 각 페이지 변환 → 파일 저장
4. 동기화 완료 시 성공 메시지 및 동기화된 페이지 수 표시
5. 동기화 중 오류 발생 시 일부 성공/실패 페이지 수 표시
6. 동기화 이력을 JSON 파일에 저장 (sync-history.json: 페이지 ID, 마지막 동기화 시간)
7. 사용자 테스트: 실제 Confluence 페이지 1개 이상 성공적으로 동기화

---

## Epic 2: Content Fidelity & Local Customization

**Epic Goal:**
데이터 무결성과 사용자 커스터마이징을 동시에 보장하기 위해, Confluence의 특수 콘텐츠(PlantUML, Draw.io)를 원본 형식으로 보존하고, 콘텐츠 영역 분리를 통해 로컬에서 추가한 메모/백링크가 재동기화 시에도 유지되도록 한다. 또한 첨부파일 다운로드 및 페이지 간 링크를 Obsidian 위키링크로 변환하여 완전한 지식 그래프 구조를 실현한다.

### Story 2.1: Content Region Separation Markers

**As a** 플러그인 사용자,
**I want** 동기화된 파일이 Confluence 원본 영역과 내 로컬 메모 영역으로 명확히 구분되어 있고,
**so that** 로컬에서 추가한 백링크나 태그가 재동기화 시에도 보존된다.

**Acceptance Criteria:**
1. 파일 저장 시 콘텐츠 영역 분리 마커 삽입
   ```markdown
   <!-- CONFLUENCE CONTENT START -->
   [Confluence 원본 내용]
   <!-- CONFLUENCE CONTENT END -->

   ---

   ## 내 메모 (로컬 전용)
   [사용자가 추가한 내용]
   ```
2. 재동기화 시 기존 파일 읽기 및 마커 감지
3. 마커 사이의 Confluence 원본 영역만 업데이트
4. 마커 이후의 로컬 메모 영역은 절대 수정하지 않음
5. 신규 파일 생성 시 로컬 메모 영역 템플릿 자동 추가
6. 단위 테스트: 기존 파일 파싱 및 영역 분리 로직 검증
7. 통합 테스트: 재동기화 후 로컬 메모 보존 확인

### Story 2.2: Change Detection with Timestamp Comparison

**As a** 플러그인 사용자,
**I want** 변경된 Confluence 페이지만 업데이트되고,
**so that** 불필요한 파일 재작성을 피하고 동기화 속도를 높인다.

**Acceptance Criteria:**
1. 동기화 이력 파일(sync-history.json)에 페이지별 마지막 동기화 타임스탬프 저장
2. Confluence API의 `lastModified` 필드와 로컬 타임스탬프 비교
3. `lastModified`가 더 최신이면 페이지 업데이트 실행
4. 변경 없는 페이지는 스킵하고 로그에 기록
5. 동기화 완료 후 sync-history.json 업데이트
6. 설정 UI에 "강제 전체 동기화" 옵션 추가 (타임스탬프 무시)
7. 단위 테스트: 타임스탬프 비교 로직 검증

### Story 2.3: PlantUML Macro Preservation

**As a** 플러그인 사용자,
**I want** Confluence의 PlantUML 다이어그램이 코드 블록 형태로 보존되고,
**so that** Obsidian PlantUML 플러그인으로 렌더링하거나 직접 편집할 수 있다.

**Acceptance Criteria:**
1. Confluence Storage Format에서 PlantUML 매크로 감지 (`<ac:structured-macro ac:name="plantuml">`)
2. 매크로 내 PlantUML 코드 추출
3. 마크다운 코드 블록 형식으로 변환:
   ````markdown
   ```plantuml
   @startuml
   [PlantUML 코드]
   @enduml
   ```
   ````
4. HTML → Markdown 변환 시 PlantUML 매크로 우선 처리
5. 첫 동기화 시 Obsidian PlantUML 플러그인 미설치 감지 → 설치 안내 Notice 표시
6. 단위 테스트: PlantUML 매크로 파싱 및 변환 검증
7. 통합 테스트: 실제 PlantUML 포함 페이지 동기화 성공

### Story 2.4: Draw.io Diagram Export

**As a** 플러그인 사용자,
**I want** Confluence의 Draw.io 다이어그램이 `.drawio` 파일로 저장되고,
**so that** Obsidian Diagrams.net 플러그인으로 열어서 편집할 수 있다.

**Acceptance Criteria:**
1. Confluence Storage Format에서 Draw.io 매크로 감지 (`<ac:structured-macro ac:name="drawio">`)
2. Draw.io XML 데이터 추출
3. 파일명: `{페이지-slug}-diagram-{번호}.drawio`로 저장
4. Vault의 `attachments/` 폴더에 저장 (설정 가능)
5. 마크다운에 임베딩 코드 삽입: `![[diagram-file.drawio]]`
6. 첫 동기화 시 Obsidian Diagrams.net 플러그인 미설치 감지 → 설치 안내
7. 통합 테스트: Draw.io 포함 페이지 동기화 및 파일 생성 확인

### Story 2.5: Attachment Download & Link Conversion

**As a** 플러그인 사용자,
**I want** Confluence 페이지의 첨부파일(이미지, PDF 등)이 로컬에 다운로드되고 링크가 변환되어,
**so that** Obsidian에서 오프라인으로도 첨부파일을 볼 수 있다.

**Acceptance Criteria:**
1. Confluence API에서 페이지의 첨부파일 목록 조회
2. 각 첨부파일을 Vault의 `attachments/{페이지-slug}/` 폴더에 다운로드
3. 마크다운 내 Confluence 첨부파일 URL을 로컬 경로로 변환
   - 이미지: `![alt](attachments/페이지-slug/image.png)`
   - 기타: `[파일명](attachments/페이지-slug/file.pdf)`
4. 파일명 충돌 시 숫자 suffix 추가
5. 다운로드 실패 시 원본 URL 유지 및 경고 로그
6. 진행률 표시: "첨부파일 다운로드 중 (3/10)"
7. 통합 테스트: 이미지 포함 페이지 동기화 및 로컬 이미지 표시 확인

### Story 2.6: Confluence Page Link Transformation

**As a** 플러그인 사용자,
**I want** Confluence 페이지 간 링크가 Obsidian 위키링크로 변환되고,
**so that** Obsidian에서 백링크와 그래프 뷰가 정상 작동한다.

**Acceptance Criteria:**
1. Confluence 페이지 링크 감지 (`<a href="/wiki/spaces/SPACE/pages/123456">`)
2. 페이지 ID → 파일명 매핑 테이블 구축 (sync-history.json에 저장)
3. Confluence 링크를 Obsidian 위키링크로 변환: `[[파일명]]`
4. 링크된 페이지가 아직 동기화 안 된 경우 원본 URL 유지 및 TODO 주석 추가
5. 외부 링크는 변환하지 않고 그대로 유지
6. 단위 테스트: 링크 파싱 및 변환 로직 검증
7. 통합 테스트: 링크된 두 페이지 동기화 후 그래프 뷰에서 연결 확인

---

## Epic 3: User Experience & Advanced Features

**Epic Goal:**
실제 일상 사용을 위한 편의 기능을 추가하여 플러그인을 완성한다. 선택적 동기화 필터로 불필요한 데이터를 제외하고, 백그라운드 변경 감지와 알림 UI로 최신 상태를 유지하며, 다중 테넌트 관리로 여러 Confluence 인스턴스를 통합 관리한다. 또한 오류 처리, 로깅, 성능 최적화를 통해 안정적이고 빠른 동기화 경험을 제공한다.

### Story 3.1: Selective Sync Filters UI

**As a** 플러그인 사용자,
**I want** 설정에서 동기화 대상을 필터링할 수 있고,
**so that** 특정 Space나 Label이 붙은 페이지만 동기화하여 불필요한 데이터를 제외할 수 있다.

**Acceptance Criteria:**
1. 설정 UI에 필터 섹션 추가
2. Space 필터: 다중 선택 드롭다운 (체크박스)
3. Label 필터: 쉼표로 구분된 텍스트 입력 (예: `sync-to-obsidian, personal`)
4. 페이지 트리 필터: 특정 페이지 ID 입력 → 해당 페이지와 모든 하위 페이지만 동기화
5. "필터 없음 (모든 페이지)" 옵션
6. 설정 저장 시 Plugin Data에 저장
7. 동기화 실행 시 필터 조건을 CQL 쿼리에 반영

### Story 3.2: Filter Logic Implementation

**As a** 플러그인 개발자,
**I want** 사용자가 설정한 필터를 CQL 쿼리로 변환하고,
**so that** Confluence API 호출 시 필터링된 페이지만 조회한다.

**Acceptance Criteria:**
1. 필터 조건 → CQL 쿼리 변환 로직 구현
   - Space: `space in (SPACE1, SPACE2)`
   - Label: `label in (label1, label2)`
   - 페이지 트리: `ancestor = 123456`
2. 복합 필터 지원 (Space AND Label)
3. 필터 없음 시 기본 쿼리: `creator = currentUser()`
4. CQL 쿼리 빌더 모듈 작성 (cql-builder.ts)
5. 단위 테스트: 다양한 필터 조합 → CQL 쿼리 검증
6. 통합 테스트: 필터 적용 후 예상 페이지만 조회 확인
7. 오류 처리: 잘못된 CQL 쿼리 시 사용자 친화적 오류 메시지

### Story 3.3: Background Change Detection Scheduler

**As a** 플러그인 사용자,
**I want** Obsidian 시작 시 백그라운드에서 Confluence 변경사항을 자동 체크하고,
**so that** 수동으로 확인하지 않아도 최신 상태를 알 수 있다.

**Acceptance Criteria:**
1. Obsidian 플러그인 로드 시 백그라운드 체크 스케줄러 시작
2. 설정에서 체크 빈도 설정 (기본: Obsidian 시작 시 1회, 옵션: 매 30분)
3. 백그라운드 체크: Confluence API에서 페이지 목록의 `lastModified` 조회
4. 로컬 sync-history.json과 비교하여 변경된 페이지 감지
5. 변경 감지 시 알림 표시 (다음 Story에서 구현)
6. 체크 중 네트워크 오류 시 조용히 실패 (사용자 방해 금지)
7. 설정에서 "백그라운드 체크 비활성화" 옵션 제공

### Story 3.4: Change Notification UI with Actions

**As a** 플러그인 사용자,
**I want** 변경사항이 감지되면 알림과 함께 "지금 동기화" 버튼을 볼 수 있고,
**so that** 원할 때 바로 동기화를 실행하거나 나중으로 미룰 수 있다.

**Acceptance Criteria:**
1. 변경 감지 시 Obsidian Notice API로 알림 표시
2. 알림 내용: "🔔 Confluence에 {n}개 페이지 업데이트됨"
3. 알림에 액션 버튼 2개:
   - "지금 동기화" → 즉시 동기화 실행
   - "나중에" → 알림 닫기
4. "지금 동기화" 클릭 시 변경된 페이지만 동기화 (전체 동기화 아님)
5. 동기화 진행 중 Modal 표시 (진행률 포함)
6. 알림은 5초 후 자동 사라지지 않도록 설정 (사용자 액션 대기)
7. 설정에서 "알림 비활성화" 옵션 제공

### Story 3.5: Multi-Tenant Management

**As a** 플러그인 사용자,
**I want** 여러 Confluence 테넌트를 추가하고 전환할 수 있고,
**so that** 회사 Confluence와 개인 Confluence를 모두 동기화할 수 있다.

**Acceptance Criteria:**
1. 설정 UI에서 테넌트 목록 표시 (테넌트 이름, URL, 연결 상태)
2. "테넌트 추가" 버튼 → 새 테넌트 URL 입력 및 OAuth 인증
3. 각 테넌트별 OAuth 토큰을 안전하게 저장 (암호화 검토)
4. 테넌트별 독립적 필터 설정
5. 동기화 실행 시 모든 테넌트를 순차적으로 처리
6. 설정에서 특정 테넌트 비활성화 가능 (동기화 대상에서 제외)
7. 테넌트 삭제 시 토큰 및 설정 완전 제거

### Story 3.6: Performance Optimization & Batch Processing

**As a** 플러그인 사용자,
**I want** 대량 페이지 동기화가 빠르고 안정적으로 처리되고,
**so that** 수백 개 페이지도 합리적인 시간 내에 동기화할 수 있다.

**Acceptance Criteria:**
1. 페이지 조회를 배치 처리 (한 번에 50개씩 페이지네이션)
2. 파일 쓰기를 비동기 병렬 처리 (`Promise.all` 사용, 동시 10개 제한)
3. 첨부파일 다운로드를 배치 처리 (페이지당 최대 5개 동시)
4. 진행률 표시: "동기화 중 (45/150 페이지)"
5. 메모리 사용량 모니터링 및 대용량 페이지 스트리밍 처리
6. 성능 테스트: 100개 페이지 동기화를 5분 이내 완료
7. 오류 발생 시 나머지 페이지 계속 처리 (부분 실패 허용)

### Story 3.7: Error Handling & Logging System

**As a** 플러그인 개발자,
**I want** 모든 오류가 적절히 처리되고 로깅되며,
**so that** 사용자가 문제를 이해하고 개발자가 디버깅할 수 있다.

**Acceptance Criteria:**
1. 중앙 로깅 시스템 구현 (console.log → 로그 파일)
2. 로그 레벨: DEBUG, INFO, WARN, ERROR
3. 로그 파일 위치: `.obsidian/plugins/confluence-sync/logs/`
4. 주요 오류 유형별 사용자 메시지:
   - 네트워크 오류: "Confluence 연결 실패. 네트워크를 확인하세요."
   - 인증 오류: "Confluence 인증이 만료되었습니다. 다시 로그인하세요."
   - 파일 쓰기 오류: "파일 저장 실패: [파일명]"
5. 오류 발생 시 상세 로그는 파일에, 간단한 메시지는 Notice로 표시
6. 설정에서 로그 레벨 선택 (기본: INFO)
7. 디버그 모드: 설정에서 활성화 → 모든 API 요청/응답 로깅

---

## Checklist Results Report

### Executive Summary

**Overall PRD Completeness:** 85%

**MVP Scope Appropriateness:** Just Right - 3개 Epic 구조가 점진적 가치 제공에 적합

**Readiness for Architecture Phase:** Ready - 기술 제약사항 및 요구사항이 명확히 정의됨

**Most Critical Gaps:**
1. UI 설계 목표 섹션 누락 (플러그인이지만 설정 UI 필요)
2. 구체적 성공 메트릭 미정의 (사용자 채택률, 동기화 성공률 등)
3. 경쟁사 분석 부재 (유사 Obsidian 플러그인 조사)

### Category Analysis

| Category | Status | Critical Issues |
|----------|--------|----------------|
| 1. Problem Definition & Context | PARTIAL (75%) | 성공 메트릭 미정의, 사용자 리서치 부족 |
| 2. MVP Scope Definition | PASS (95%) | Out-of-scope 명시적 문서화 부족 |
| 3. User Experience Requirements | PARTIAL (70%) | UI 설계 목표 섹션 누락, 접근성 고려 미흡 |
| 4. Functional Requirements | PASS (95%) | 모든 핵심 기능 명확히 정의됨 |
| 5. Non-Functional Requirements | PASS (90%) | 성능 요구사항 구체화 필요 |
| 6. Epic & Story Structure | PASS (95%) | Epic 1에 프로젝트 초기화 포함됨 |
| 7. Technical Guidance | PASS (92%) | 아키텍처 방향 명확, 복잡도 영역 식별 |
| 8. Cross-Functional Requirements | PARTIAL (78%) | 데이터 스키마 상세화 필요 |
| 9. Clarity & Communication | PASS (90%) | 문서 구조 양호, 이해관계자 정의 필요 |

### Final Decision

**✅ READY FOR ARCHITECT**

PRD는 아키텍처 설계를 시작하기에 충분히 포괄적이고 구조화되어 있습니다. 식별된 기술 리스크는 아키텍처 단계에서 해결할 수 있으며, 높은 우선순위 개선 사항들은 개발 시작 전에 빠르게 보완 가능합니다.

---

## Next Steps

### Architect Prompt

```
브레인스토밍 결과와 PRD를 기반으로 Confluence-Obsidian Sync 플러그인의 기술 아키텍처를 설계해주세요.

주요 조사 및 설계 영역:
1. MCP OAuth 통합 방법 (Obsidian 플러그인 환경에서 브라우저 OAuth 플로우 처리)
2. Confluence Storage Format 파싱 전략 (PlantUML, Draw.io 매크로 추출)
3. 데이터 스키마 설계 (sync-history.json, 플러그인 설정 구조)
4. 파일 시스템 작업의 원자성 보장 (iCloud 충돌 방지)
5. UI 컴포넌트 아키텍처 (Settings Tab, Progress Modal, Notification)

참고 문서:
- docs/brainstorming-session-results.md
- docs/prd.md

명령어: `/BMad:agents:architect` 실행 후 "create architecture" 요청
```
