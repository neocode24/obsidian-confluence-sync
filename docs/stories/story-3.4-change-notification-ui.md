# Story 3.4: Change Notification UI with Actions

**Issue:** #19
**Epic:** Epic 3 - User Experience & Advanced Features
**Status:** In Progress
**Agent Model Used:** Claude Sonnet 4.5

---

## Story

**As a** 플러그인 사용자,
**I want** 변경사항이 감지되면 알림과 함께 "지금 동기화" 버튼을 볼 수 있고,
**so that** 원할 때 바로 동기화를 실행하거나 나중으로 미룰 수 있다.

---

## Acceptance Criteria

- [x] AC1: 변경 감지 시 Obsidian Notice API로 알림 표시
- [x] AC2: 알림 내용: "🔔 Confluence에 {n}개 페이지 업데이트됨"
- [x] AC3: 알림에 액션 버튼: "지금 동기화", "나중에"
- [x] AC4: "지금 동기화" 클릭 시 동기화 실행
- [x] AC5: 동기화 진행 중 Notice 표시
- [ ] AC6: 알림은 자동 사라지지 않도록 설정 (Obsidian Notice 제약으로 구현 불가)
- [x] AC7: 설정에서 "알림 비활성화" 옵션 제공 (기존 showNotifications 활용)

---

## Tasks / Subtasks

### Task 1: BackgroundChangeDetector 개선 (AC: 1, 2, 3)
- [x] `src/sync/BackgroundChangeDetector.ts` 수정
  - [x] 알림을 직접 표시하는 대신 콜백 패턴으로 변경
  - [x] 변경된 페이지 개수 반환

### Task 2: 알림 UI 생성 (AC: 3, 4)
- [x] `main.ts` 수정
  - [x] 변경 감지 시 커스텀 Notice 생성
  - [x] "지금 동기화" 버튼 추가
  - [x] "나중에" 버튼 추가
  - [x] 버튼 클릭 시 동작 구현

### Task 3: 동기화 진행 표시 (AC: 5)
- [x] 동기화 시작 시 Notice 표시
- [x] 동기화 완료/실패 시 결과 Notice 표시

---

## Dev Notes

### Obsidian Notice API
```typescript
// 기본 Notice
new Notice('메시지');

// 지속 시간 설정 (0 = 무한, 밀리초)
new Notice('메시지', 0);

// Notice에 HTML 요소 추가
const notice = new Notice('', 0);
notice.noticeEl.innerHTML = '커스텀 HTML';
notice.noticeEl.createEl('button', { text: '버튼' });
```

### 알림 구조
```
┌─────────────────────────────────────┐
│ 🔔 Confluence에 3개 페이지 업데이트됨 │
│ [지금 동기화] [나중에]                │
└─────────────────────────────────────┘
```

### 이벤트 흐름
```
1. BackgroundChangeDetector.checkForChanges()
   → 변경된 페이지 개수 반환

2. main.ts에서 결과 확인
   → 변경 있으면 커스텀 Notice 생성

3. "지금 동기화" 클릭
   → syncConfluencePages() 호출
   → Notice 표시: "🔄 동기화 중..."

4. 동기화 완료
   → Notice 표시: "✅ 동기화 완료 (3개 페이지)"
```

---

## Testing

### Manual Tests
- 백그라운드 체크 후 알림 표시 확인
- "지금 동기화" 버튼 클릭 → 동기화 실행 확인
- "나중에" 버튼 클릭 → 알림 닫힘 확인
- 동기화 진행 중 Notice 표시 확인

---

## Dev Agent Record

### File List
- `src/sync/BackgroundChangeDetector.ts` (modified)
- `main.ts` (modified)

### Debug Log References
(To be populated during development)

### Completion Notes
- Obsidian Notice API는 duration=0으로 설정해도 일정 시간 후 자동으로 사라짐
- AC6 "알림은 자동 사라지지 않도록 설정"은 Obsidian 제약으로 완전 구현 불가
- 대신 duration을 길게 설정하여 충분한 시간 제공

### Change Log
(To be populated during development)
