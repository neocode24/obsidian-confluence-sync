# Obsidian Confluence Sync - 프로젝트 가이드

## 프로젝트 구조

본 프로젝트는 **BMAD 프레임워크**를 기반으로 구성되어 있습니다.

## Epic 및 Story 관리

- **Epic과 Story는 GitHub Issues에서 관리됩니다**
- Issue #1-3: Epic (대분류 기능 단위)
- Issue #4-22: Story (구현 가능한 작업 단위)
- 로컬 파일이 아닌 **GitHub Issues를 Single Source of Truth**로 사용

### Story 조회 방법
```bash
gh issue view <issue-number>
```

예시:
```bash
gh issue view 4  # Story 1.1 확인
```

## 개발 워크플로우 (필수)

### 1. Feature 브랜치 생성
모든 기능 개발은 feature 브랜치에서 진행:
```bash
git checkout -b feature/story-1-1-project-init
```

브랜치 네이밍:
- `feature/story-X-Y-description`: Story 구현
- `feature/epic-X-description`: Epic 단위 작업
- `fix/issue-description`: 버그 수정

### 2. 구현 작업

Story의 Acceptance Criteria를 기준으로 구현:
1. AC (Acceptance Criteria) 확인
2. 코드 작성
3. 테스트 작성 및 실행
4. 문서 업데이트

### 3. Commit 및 Push

커밋 메시지 컨벤션:
```
[Story X.Y] 작업 내용 요약

- 구체적인 변경사항 1
- 구체적인 변경사항 2

Closes #<issue-number>
```

예시:
```bash
git add .
git commit -m "[Story 1.1] Project initialization and repository setup

- Created package.json with Obsidian plugin dependencies
- Configured TypeScript and esbuild
- Created minimal Hello World plugin
- Added comprehensive README

Closes #4"

git push origin feature/story-1-1-project-init
```

### 4. Pull Request 생성

```bash
gh pr create \
  --title "[Story 1.1] Project initialization and repository setup" \
  --body "Implements Story 1.1 (Issue #4)

## Changes
- Created package.json with dependencies
- Configured TypeScript and esbuild
- Created minimal Hello World plugin
- Added README documentation

## Acceptance Criteria
- [x] AC 1: package.json configured
- [x] AC 2: TypeScript configured
- [x] AC 3: esbuild configured
- [x] AC 4: README created
- [x] AC 5: npm install verified
- [x] AC 6: Plugin loads in Obsidian

Closes #4"
```

### 5. PR Merge 후 Issue 정리

PR이 merge되면 자동으로 Issue가 닫히지만, 수동 정리가 필요한 경우:
```bash
gh issue close <issue-number> --comment "Completed via PR #<pr-number>"
```

GitHub Project 보드 상태 업데이트:
- Story 완료 시: `In Progress` → `Done`
- Epic 진행 시: 하위 Story 완료율 추적

## 작업 체크리스트

각 Story 작업 시 반드시 확인:

- [ ] GitHub Issue에서 Story 내용 확인 (`gh issue view <number>`)
- [ ] feature 브랜치 생성 및 체크아웃
- [ ] Acceptance Criteria 기반 구현
- [ ] 테스트 작성 및 실행
- [ ] 문서 업데이트 (필요시)
- [ ] Commit with proper message (Closes #<issue>)
- [ ] Push to feature branch
- [ ] PR 생성 (본문에 AC 체크리스트 포함)
- [ ] PR merge 후 Issue 상태 확인
- [ ] GitHub Project 보드 업데이트
- [ ] 다음 Story로 이동

## 브랜치 전략

- `main`: 프로덕션 준비 코드
- `feature/*`: 기능 개발
- `fix/*`: 버그 수정
- `docs/*`: 문서만 수정

**주의**: `main` 브랜치에 직접 commit하지 않습니다. 모든 변경은 PR을 통해 진행합니다.

## 개발 환경 설정

### 필수 도구
- Node.js (v18 이상)
- npm or yarn
- Obsidian (플러그인 테스트용)
- GitHub CLI (`gh`)

### 초기 설정
```bash
npm install
npm run dev  # 개발 모드 (watch)
```

### 빌드
```bash
npm run build  # 프로덕션 빌드
```

## 기술 스택

- **언어**: TypeScript
- **빌드**: esbuild
- **프레임워크**: Obsidian Plugin API
- **인증**: MCP OAuth (API Key 사용 금지)
- **마크다운 변환**: Turndown
- **슬러그**: slugify
- **메타데이터**: js-yaml

## 보안 정책

- Confluence 접근에 **API Key 사용 금지**
- OAuth 기반 MCP 연계만 허용
- 인증 정보를 git에 commit하지 않음 (.gitignore 확인)

## 참고 문서

- PRD: `docs/prd.md`
- Brainstorming: `docs/brainstorming-session-results.md`
- GitHub Repository: https://github.com/neocode24/obsidian-confluence-sync
- GitHub Project: 진행사항 추적용 보드

## 자주 하는 실수 방지

1. ❌ 로컬 파일에서 Story 찾기 → ✅ GitHub Issue 확인
2. ❌ main 브랜치에서 직접 작업 → ✅ feature 브랜치 생성
3. ❌ Story 완료 후 Issue 방치 → ✅ PR로 자동 close 또는 수동 정리
4. ❌ GitHub Project 상태 미업데이트 → ✅ 완료 시 Done으로 이동
5. ❌ AC 확인 없이 구현 → ✅ AC 체크리스트 기반 작업
6. ❌ API Key 사용 → ✅ MCP OAuth만 사용

---

**업데이트 이력**
- 2024-11-22: 초기 작성 (BMAD 프레임워크, GitHub Issues 기반 관리, Feature 브랜치 전략)
