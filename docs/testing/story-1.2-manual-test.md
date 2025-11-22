# Story 1.2 Manual Testing Guide

## 📋 테스트 환경 준비

### 1. Obsidian Vault 준비
- [ ] Obsidian 설치 완료 (Desktop 버전)
- [ ] 테스트용 Vault 생성 또는 선택
- [ ] Community Plugins 활성화됨

### 2. 플러그인 설치

```bash
# 환경변수 설정 (한 번만)
export OBSIDIAN_VAULT="$HOME/Documents/ObsidianVault"  # 본인 경로로 수정

# 플러그인 빌드 & 설치
./install-local.sh
```

또는 수동 설치:
```bash
# 1. 빌드
npm run build

# 2. 파일 복사
cp main.js manifest.json $OBSIDIAN_VAULT/.obsidian/plugins/confluence-sync/
```

### 3. Obsidian에서 활성화
1. Obsidian 재시작
2. Settings → Community plugins → Reload
3. "Confluence Sync" 플러그인 활성화
4. Settings → Confluence Sync 확인

---

## ✅ Acceptance Criteria 테스트

### AC1: MCP Client SDK 의존성 추가 ✅

**자동 검증 (Build 성공):**
```bash
npm run build
# Expected: No errors
```

**결과:** ✅ Build 성공 확인

---

### AC2: Settings UI - Tenant URL 입력 필드 ✅

**테스트 단계:**
1. Obsidian Settings 열기 (⌘ + ,)
2. "Confluence Sync" 탭 찾기
3. "Confluence URL" 입력 필드 확인

**예상 결과:**
- [ ] "Confluence URL" 입력 필드 표시
- [ ] Placeholder: `https://yourcompany.atlassian.net`
- [ ] URL 입력 후 자동 저장

**테스트 케이스:**
```
입력: https://test.atlassian.net
예상: 설정 저장됨 (Obsidian Plugin Data)
```

**검증 방법:**
```bash
# Settings 파일 확인
cat $OBSIDIAN_VAULT/.obsidian/plugins/confluence-sync/data.json
# Expected: {"tenants":[{"id":"...","url":"https://test.atlassian.net",...}]}
```

---

### AC3: "Confluence 연결" 버튼 클릭 시 OAuth Flow ⚠️

**테스트 단계:**
1. Settings → Confluence Sync
2. Confluence URL 입력 (예: `https://test.atlassian.net`)
3. "연결" 버튼 클릭

**예상 동작:**
- [ ] "🔄 MCP Server 연결 중..." Notice 표시
- [ ] MCP Server 프로세스 시작 시도
- [ ] "🔄 OAuth 인증 시작 중..." Notice 표시

**가능한 결과:**

#### ✅ 성공 케이스:
- Browser가 OAuth 페이지 열림
- Confluence 로그인 화면
- "✅ Confluence 인증 성공!" Notice

#### ❌ 실패 케이스 (예상):
```
❌ MCP Server 연결 실패

MCP Server 연결 실패: spawn npx ENOENT

MCP Server가 실행 중인지 확인하세요.
```

**원인:** Obsidian Electron 환경에서 `npx` 명령 실행 불가

---

### AC4: OAuth Token 저장 ⏸️

**테스트 조건:**
- AC3이 성공해야 테스트 가능

**검증 방법:**
```bash
# Plugin Data 확인
cat $OBSIDIAN_VAULT/.obsidian/plugins/confluence-sync/data.json
```

**예상 내용:**
```json
{
  "tenants": [{
    "id": "tenant-...",
    "url": "https://test.atlassian.net",
    "enabled": true
  }]
}
```

**주의:** Token은 MCP SDK가 관리하므로 Plugin Data에 저장되지 않을 수 있음

---

### AC5: 인증 실패 시 에러 메시지 ✅

**테스트 케이스:**

#### Test 1: URL 미입력
1. Settings에서 URL 필드 비움
2. "연결" 버튼 클릭

**예상 결과:**
```
⚠️ Confluence URL을 먼저 입력해주세요.
```

#### Test 2: MCP Connection 실패 (예상됨)
1. 유효한 URL 입력
2. "연결" 버튼 클릭

**예상 에러:**
```
❌ MCP Server 연결 실패

[에러 메시지]

MCP Server가 실행 중인지 확인하세요.
```

**검증:**
- [ ] Notice가 10초간 표시 (자동 사라지지 않음)
- [ ] 에러 메시지가 사용자 친화적임
- [ ] Console에 상세 로그 출력

**Console 확인 방법:**
```
Obsidian → Help → Toggle Developer Tools → Console 탭
```

---

### AC6: Token 자동 갱신 ⏸️

**테스트 불가 사유:**
- MCP SDK가 자동 처리
- 실제 Token 만료까지 대기 필요 (수 시간~수 일)

**대안:**
- MCP SDK 문서 확인
- 통합 테스트 시 검증

---

### AC7: 연결 상태 표시 ✅

**테스트 단계:**
1. Settings → Confluence Sync 열기
2. 연결 상태 섹션 확인

**예상 결과 (연결 전):**
```
❌ 연결 안 됨
```

**예상 결과 (연결 후):**
```
✅ 연결됨: https://test.atlassian.net
```

**검증:**
- [ ] 상태가 UI에 표시됨
- [ ] 상태가 실시간 업데이트됨 (연결 후)

---

## 🔧 디버깅 가이드

### Console 로그 확인

Obsidian Developer Tools 열기:
```
Help → Toggle Developer Tools (⌥⌘I)
```

**주요 로그:**
```javascript
// MCP 초기화
"MCP Client connected to https://..."

// OAuth 시작
"OAuth flow initiated: ..."

// 에러
"Failed to initialize MCP client: ..."
"OAuth flow failed: ..."
```

### 파일 위치

**Plugin Data:**
```
$OBSIDIAN_VAULT/.obsidian/plugins/confluence-sync/data.json
```

**Plugin Files:**
```
$OBSIDIAN_VAULT/.obsidian/plugins/confluence-sync/
├── main.js
├── manifest.json
└── data.json (after settings saved)
```

---

## 🚧 알려진 이슈

### Issue 1: MCP Server 실행 실패 (예상됨)

**증상:**
```
❌ MCP Server 연결 실패
spawn npx ENOENT
```

**원인:**
- Obsidian Electron 환경에서 `npx` 명령 접근 불가
- `StdioClientTransport`가 child_process 사용

**해결 방법:**
1. **MCP Server 별도 실행** (권장)
   ```bash
   # Terminal에서 MCP Server 수동 실행
   npx -y @modelcontextprotocol/server-atlassian
   ```

2. **Electron 환경에서 경로 지정**
   ```typescript
   // ConfluenceClient.ts 수정
   command: '/usr/local/bin/npx'  // 절대 경로
   ```

3. **Claude Desktop MCP 활용**
   - Claude Desktop에서 MCP Server 설정
   - Obsidian은 MCP Server에 연결만

---

## 📊 테스트 결과 기록

| AC | 테스트 | 결과 | 비고 |
|----|--------|------|------|
| AC1 | Build 성공 | ✅ | - |
| AC2 | Settings UI | ⬜ | 테스트 필요 |
| AC3 | OAuth Flow | ⬜ | MCP Server 이슈 예상 |
| AC4 | Token 저장 | ⬜ | AC3 성공 후 |
| AC5 | 에러 메시지 | ⬜ | 테스트 필요 |
| AC6 | Token 갱신 | ⏸️ | MCP SDK 자동 |
| AC7 | 연결 상태 | ⬜ | 테스트 필요 |

---

**테스트 완료 후 이 파일을 업데이트하고 GitHub Issue에 결과를 코멘트해주세요.**
