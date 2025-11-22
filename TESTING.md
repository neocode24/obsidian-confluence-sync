# Obsidian Manual Testing - Quick Start

## 🚀 빠른 시작

### 1. 플러그인 설치

```bash
# Vault 경로 설정
export OBSIDIAN_VAULT="$HOME/Documents/ObsidianVault"  # 본인 경로로 수정

# 설치 스크립트 실행
./install-local.sh
```

### 2. Obsidian에서 활성화

1. Obsidian 재시작
2. **Settings (⌘,)** → **Community plugins** → **Reload**
3. **"Confluence Sync"** 활성화
4. **Settings** → **Confluence Sync** 이동

### 3. 테스트 실행

Settings 화면에서:
1. **Confluence URL** 입력: `https://yourcompany.atlassian.net`
2. **"연결"** 버튼 클릭
3. 결과 확인 (Notice 메시지)

### 4. 디버깅

**Developer Console 열기:**
- Mac: `⌥⌘I`
- Windows/Linux: `Ctrl+Shift+I`

**로그 확인:**
```javascript
// Console 탭에서 확인
"Loading Confluence Sync plugin"
"MCP Client connected to..."
```

---

## 📋 상세 테스트 가이드

전체 테스트 가이드: [docs/testing/story-1.2-manual-test.md](docs/testing/story-1.2-manual-test.md)

---

## 🐛 알려진 이슈

### MCP Server 실행 실패 (예상됨)

**증상:**
```
❌ MCP Server 연결 실패
spawn npx ENOENT
```

**해결:**
MCP Server를 별도 터미널에서 실행:
```bash
npx -y @modelcontextprotocol/server-atlassian
```

---

## 📞 문제 해결

Issue가 발생하면:
1. Developer Console 로그 확인
2. `data.json` 파일 확인
3. GitHub Issue #5에 코멘트
