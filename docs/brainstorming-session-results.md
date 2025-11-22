# Brainstorming Session Results

**Session Date:** 2025-11-22
**Facilitator:** Business Analyst Mary
**Participant:** neocode24

## Executive Summary

**Topic:** Confluence-Obsidian 지식 관리 시스템 통합 및 온톨로지 구축

**Session Goals:**
- Obsidian 중심 지식 통합 아키텍처 설계
- Confluence 단방향 동기화 구현 방안 도출
- 폴더 트리 구조 한계 극복 및 온톨로지 기반 지식 그래프 구축 방안 탐색

**Techniques Used:**
- First Principles Thinking (15분)
- Morphological Analysis (20분)
- Assumption Reversal (10분)

**Total Ideas Generated:** 47+ 설계 결정 및 인사이트

**Key Themes Identified:**
- 파편화된 지식 통합 (Confluence 다중 테넌트 + Obsidian)
- 폴더 트리 → 네트워크 기반 지식 구조로 전환
- 단방향 동기화이지만 로컬 메모 보존 필요
- 원본 형식 보존 (PlantUML, Draw.io) 중요
- 사용자 중심 UX (수동 실행 + 변경 알림)

---

## Technique Sessions

### First Principles Thinking - 15분

**Description:** 시스템의 핵심 구성요소와 근본 요구사항을 분해하여 진짜 해결해야 할 문제 파악

**Ideas Generated:**

1. **문제의 본질 식별**
   - 파편화: Confluence(다중 테넌트) + Obsidian에 지식 분산
   - 폴더 트리 구조의 한계: 깊이 3-4단계부터 찾기/정리 어려움
   - 재작성 낭비: 같은 내용을 여러 곳에 작성하는 불편함

2. **진짜 원하는 것**
   - 단일 진실 공급원(Single Source of Truth): Obsidian + iCloud
   - 구조: 폴더가 아닌 관계 기반 네트워크
   - 접근성: 모든 단말(Mac, iPad, iPhone)에서 접근 가능

3. **시스템 핵심 컴포넌트**
   - 데이터 소스: Confluence (다중 테넌트, 내가 작성한 콘텐츠만)
   - 저장소: Obsidian (iCloud 동기화)
   - 구조: Flat + 메타데이터 기반 (폴더 트리 탈피)
   - 동기화: 사용자 명령 기반 단방향 (Confluence → Obsidian)
   - 변경 감지: 업데이트된 페이지만 반영

4. **보존 대상 정의**
   - 포함: 텍스트, 메타데이터, 페이지 간 링크, 첨부파일
   - 제외: 댓글
   - 특수 처리: PlantUML, Draw.io 원본 형식 보존

5. **제약사항 명확화**
   - OAuth 기반 MCP만 사용 가능 (API Key 보안 정책상 금지)
   - 다중 테넌트 구조

6. **구조 전환 인사이트**
   - 기존: `/프로젝트/2024/고객A/회의록/2024-01-15.md`
   - 새로운: `/notes/2024-01-15-고객A회의.md` + 메타데이터 (tags, links)
   - Obsidian 그래프 뷰/백링크 활용

7. **도구 통일 결정**
   - MWeb → Obsidian 전환 (iOS/iPadOS 포함)
   - 모든 기기에서 일관된 백링크/그래프 뷰 경험

**Insights Discovered:**
- 진짜 문제는 "동기화"가 아니라 "지식 구조의 한계"였음
- 폴더 계층은 지식의 다차원적 관계를 표현하지 못함
- 온톨로지 = 네트워크 구조 + 메타데이터 + 관계 링크

**Notable Connections:**
- Obsidian의 백링크 기능이 온톨로지 구축의 핵심 메커니즘
- iCloud 동기화로 인프라 문제 해결 완료
- MCP OAuth가 보안 정책 준수하면서 API 접근 가능

---

### Morphological Analysis - 20분

**Description:** 각 핵심 컴포넌트의 구현 옵션 매트릭스 구성 및 최적 조합 탐색

**Ideas Generated:**

**파라미터 1: 동기화 엔진 구현 방식**
1. Python 스크립트 + MCP 클라이언트
2. **Obsidian 플러그인 (TypeScript)** ✓ 선택
3. CLI 도구 (Go/Rust)
4. Node.js 스크립트 + MCP SDK

**파라미터 2: 메타데이터 저장 방식**
1. **YAML Frontmatter (파일 상단)** ✓ 선택
2. 별도 메타데이터 파일 (.json)
3. 데이터베이스 (SQLite)
4. 하이브리드 (YAML + SQLite)

**파라미터 3: 콘텐츠 변환 처리**
1. 플러그인 내장 변환기
2. 외부 변환 라이브러리
3. 부분 변환 + 원본 보존
4. 변환 스킵 + 경고
5. **원본 형식 보존 + Obsidian 플러그인 의존** ✓ 선택
   - PlantUML 코드 블록 그대로 보존
   - Draw.io 파일 `.drawio` 형식으로 저장
   - Obsidian 플러그인으로 렌더링

**파라미터 4: 변경 감지 메커니즘**
1. **타임스탬프 비교 + 콘텐츠 영역 분리** ✓ 선택
   - Confluence `lastModified` vs 로컬 메타데이터
   - 원본 영역만 업데이트, 로컬 메모 보존
2. 버전 번호 비교
3. 콘텐츠 해시 비교
4. 동기화 이력 DB (SQLite)

**파라미터 5: 파일 명명 규칙**
1. Confluence 페이지 제목 그대로
2. **Slug화 (URL-safe)** ✓ 선택
   - 예: `api-설계-가이드.md`
3. ID 기반 + 제목
4. Space별 폴더 + 제목

**파일 구조 예시:**
```markdown
---
title: API 설계 가이드
confluence_id: 123456789
confluence_space: TEAM-ALPHA
confluence_url: https://...
author: neocode24
created: 2024-01-15
updated: 2024-11-22
tags: [프로젝트, API]
---

<!-- CONFLUENCE CONTENT START -->
# API 설계 가이드
Confluence에서 가져온 원본 내용...
<!-- CONFLUENCE CONTENT END -->

---

## 내 메모 (로컬 전용)
[[관련문서]] 참고
#내태그 #추가인사이트
```

**Insights Discovered:**
- TypeScript 플러그인이 Java 개발자에게 학습 가능한 범위
- YAML Frontmatter가 Obsidian 표준 방식
- 콘텐츠 영역 분리로 양방향 동기화 불필요
- Obsidian 플러그인 생태계 활용 (PlantUML, Draw.io 플러그인 존재)

**Notable Connections:**
- 콘텐츠 영역 분리가 "로컬 백링크 추가" 문제 해결
- Slug 파일명이 URL-safe하면서도 검색 가능
- MWeb 데이터 마이그레이션도 Obsidian으로 통합 가능

---

### Assumption Reversal - 10분

**Description:** 현재 가정들을 뒤집어 혁신적 접근법 발견 및 예상 못한 문제점 사전 발견

**Ideas Generated:**

1. **가정: "Confluence → Obsidian 단방향만 필요하다"**
   - 뒤집기: Obsidian → Confluence 역방향?
   - 결론: 현재는 불필요, 향후 확장 가능성

2. **가정: "모든 Confluence 페이지를 동기화해야 한다"**
   - 뒤집기: 선택적 동기화
   - 인사이트: ✓ **필터링 필요성 발견**
     - 특정 테넌트만
     - 특정 Space만
     - 특정 페이지 하위 트리만
     - Label 기반 필터 (`#sync-to-obsidian`)

3. **가정: "동기화는 수동 실행이다"**
   - 뒤집기: 자동 동기화, 스케줄링
   - 인사이트: ✓ **UX 개선 기회 발견**
     - 백그라운드 변경 감지
     - 알림 UI: "🔔 3개 페이지 업데이트됨 [지금 동기화] [나중에]"
     - 사용자가 원할 때 실행 (제어권 유지)

4. **가정: "파일 형태로 저장해야 한다"**
   - 뒤집기: Dataview 플러그인으로 DB 쿼리?
   - 결론: 파일 기반 유지 (단순성 우선)
   - 향후 옵션: Dataview로 확장 가능

**Insights Discovered:**
- 선택적 동기화는 필수 기능 (불필요한 데이터 제외)
- 백그라운드 체크가 사용자 경험 크게 향상
- 단순성(파일 기반) vs 확장성(DB 쿼리) 트레이드오프

**Notable Connections:**
- 백그라운드 알림이 "수동 실행"과 "자동화"의 균형점
- 선택적 동기화로 다중 테넌트 관리 가능

---

## Idea Categorization

### Immediate Opportunities
*구현 준비 완료된 핵심 기능*

1. **마크다운 변환 + YAML Frontmatter** ⭐
   - Description: Confluence 페이지를 Obsidian 마크다운으로 변환하고 메타데이터를 YAML로 저장
   - Why immediate: Obsidian 표준 방식, 검증된 접근법
   - Resources needed: Confluence API 문서, Obsidian 플러그인 개발 가이드

2. **파일 저장 (Slug 파일명)** ⭐
   - Description: URL-safe한 파일명으로 저장 (예: `api-설계-가이드.md`)
   - Why immediate: 특수문자 문제 방지, 크로스 플랫폼 호환성
   - Resources needed: Slug 변환 라이브러리 (TypeScript)

3. **콘텐츠 영역 분리** ⭐
   - Description: Confluence 원본 영역과 로컬 메모 영역 구분
   - Why immediate: 핵심 가치 - 로컬 백링크/태그 보존
   - Resources needed: 마크다운 파싱/삽입 로직

4. **PlantUML/Draw.io 원본 보존** ⭐
   - Description: 변환 없이 원본 형식 그대로 저장
   - Why immediate: 데이터 손실 방지, Obsidian 플러그인 활용
   - Resources needed: Confluence 매크로 파싱 로직

5. **MCP OAuth 연동**
   - Description: 보안 정책 준수하는 Confluence API 접근
   - Why immediate: API Key 사용 불가, MCP 필수
   - Resources needed: Atlassian MCP 서버, OAuth 설정

6. **내가 작성한 페이지만 조회**
   - Description: 작성자 필터로 내 콘텐츠만 추출
   - Why immediate: 핵심 요구사항 - 남의 내용 제외
   - Resources needed: Confluence API 쿼리 (CQL: creator = currentUser())

### Future Innovations
*추가 개발/연구 필요*

7. **선택적 동기화 필터**
   - Description: 테넌트/Space/페이지 트리/Label 기반 필터링
   - Development needed: 설정 UI, 필터 로직 구현
   - Timeline estimate: MVP 이후 2주

8. **백그라운드 변경 감지**
   - Description: Obsidian 시작 시 자동으로 Confluence 변경사항 체크
   - Development needed: 백그라운드 작업 스케줄링, API 폴링
   - Timeline estimate: Phase 3

9. **알림 UI**
   - Description: "🔔 3개 페이지 업데이트됨" 형태 알림 표시
   - Development needed: Obsidian Notice API 활용, 액션 버튼
   - Timeline estimate: 백그라운드 체크와 함께 구현

10. **첨부파일 다운로드**
    - Description: 이미지, PDF 등 첨부파일 로컬 저장
    - Development needed: 파일 다운로드, 경로 관리, 마크다운 링크 변환
    - Timeline estimate: MVP 이후 1주

11. **페이지 간 링크 변환**
    - Description: Confluence 링크 → Obsidian 위키링크 변환
    - Development needed: 링크 파싱, ID→파일명 매핑
    - Timeline estimate: MVP 이후 1주

12. **다중 테넌트 관리**
    - Description: 여러 Confluence 인스턴스 동시 관리
    - Development needed: 테넌트별 OAuth 설정, UI 전환
    - Timeline estimate: Phase 3

### Moonshots
*야심찬 변혁적 컨셉*

13. **Obsidian → Confluence 역방향 동기화**
    - Description: Obsidian에서 작성한 내용을 Confluence로 발행
    - Transformative potential: 완전한 양방향 통합, Obsidian을 주 편집 도구로
    - Challenges to overcome: 충돌 해결, 권한 관리, 콘텐츠 변환 역방향 로직

14. **온톨로지 자동 구축**
    - Description: AI 기반 태그 추천, 자동 백링크 제안
    - Transformative potential: 지식 그래프 자동 완성
    - Challenges to overcome: NLP 모델 통합, 정확도, 성능

15. **협업 지식 그래프**
    - Description: 팀원들의 Obsidian 지식 그래프 병합/공유
    - Transformative potential: 조직 차원 집단 지성
    - Challenges to overcome: 프라이버시, 동기화 복잡도, 충돌 관리

16. **시맨틱 검색**
    - Description: 의미 기반 검색 (키워드 아닌 개념 검색)
    - Transformative potential: "비슷한 개념 찾기" 자동화
    - Challenges to overcome: 임베딩 생성, 벡터 DB 통합

### Insights & Learnings

- **폴더 vs 네트워크**: 지식의 본질은 계층이 아닌 관계망. 폴더는 도구의 한계였음
- **단방향도 충분**: 양방향 동기화 복잡도 피하면서 로컬 메모 영역으로 가치 보존
- **원본 보존 원칙**: 변환보다 원본 유지가 데이터 무결성과 편집 가능성 보장
- **UX 철학**: 자동화보다 "알림 + 사용자 선택"이 제어권과 편의성 균형
- **도구 통일의 가치**: MWeb → Obsidian 전환으로 모든 기기 경험 일관성
- **보안과 기능의 균형**: OAuth MCP가 제약이자 표준 준수 경로
- **메타데이터가 온톨로지 기반**: YAML + 백링크 + 태그 = 지식 그래프 구조

---

## Action Planning

### Top 3 Priority Ideas

#### #1 Priority: TypeScript Obsidian 플러그인 MVP 구축

**Rationale:**
- 핵심 기능 4개(마크다운 변환, 파일 저장, 콘텐츠 분리, 원본 보존) 모두 포함
- 실제 사용 가능한 최소 제품
- 이후 확장의 기반

**Next steps:**
1. Obsidian 플러그인 개발 환경 설정 (TypeScript, 샘플 플러그인)
2. MCP Atlassian 서버 OAuth 설정
3. Confluence API 테스트 (내 페이지 조회, 콘텐츠 가져오기)
4. 마크다운 변환 + YAML 생성 로직 구현
5. 파일 저장 (slug 파일명)
6. 콘텐츠 영역 분리 마커 삽입

**Resources needed:**
- Obsidian Plugin Developer Docs
- Atlassian Confluence REST API 문서
- MCP 서버 설정 가이드
- TypeScript/Node.js 개발 환경
- 테스트용 Confluence 페이지

**Timeline:** 2-3주 (주말 작업 기준)

---

#### #2 Priority: 특수 콘텐츠 처리 (PlantUML, Draw.io, 첨부파일)

**Rationale:**
- 핵심 가치 - 데이터 손실 없는 완전한 동기화
- 실무에서 자주 사용되는 콘텐츠 유형
- Obsidian 플러그인 생태계 활용

**Next steps:**
1. Confluence 매크로 파싱 로직 (PlantUML, Draw.io 감지)
2. PlantUML 코드 블록 추출 및 보존
3. Draw.io XML 추출 및 `.drawio` 파일 저장
4. 첨부파일 다운로드 및 로컬 경로 링크 변환
5. Obsidian PlantUML/Draw.io 플러그인 설치 가이드 작성

**Resources needed:**
- Confluence Storage Format 문서
- Obsidian PlantUML 플러그인
- Obsidian Diagrams.net 플러그인
- 파일 다운로드 라이브러리

**Timeline:** MVP 완료 후 1-2주

---

#### #3 Priority: 사용자 경험 개선 (백그라운드 체크, 알림, 선택적 동기화)

**Rationale:**
- 실제 사용 편의성 극대화
- 불필요한 데이터 제외 (선택적 동기화)
- 능동적 알림으로 최신 상태 유지

**Next steps:**
1. 설정 UI 구현 (테넌트, Space, 페이지 필터)
2. 백그라운드 체크 스케줄러 (Obsidian 시작 시)
3. 변경사항 알림 UI (Notice API)
4. "지금 동기화" / "나중에" 액션 버튼
5. 동기화 이력 저장 (SQLite 또는 JSON)

**Resources needed:**
- Obsidian Settings Tab API
- Obsidian Notice/Modal API
- 백그라운드 작업 스케줄링 로직
- 필터 설정 UI 디자인

**Timeline:** Phase 2 완료 후 2주

---

## Reflection & Follow-up

### What Worked Well

- First Principles로 "폴더 트리 한계"라는 근본 문제 발견
- Morphological Analysis로 각 설계 결정의 옵션 체계적 비교
- Assumption Reversal로 "선택적 동기화"와 "백그라운드 알림" 인사이트 도출
- Java 개발자 배경 고려한 TypeScript 선택
- Obsidian 모바일 앱 발견으로 MWeb 통합 결정

### Areas for Further Exploration

- **Confluence CQL 쿼리**: 복잡한 필터 조건 표현 방법 연구
- **타임스탬프 vs 버전 비교**: 변경 감지 정확도 비교 테스트 필요
- **Obsidian Dataview 활용**: 향후 수천 개 파일 관리 시 쿼리 기반 접근 재검토
- **AI 기반 태그 추천**: GPT API로 자동 태그/백링크 제안 가능성
- **협업 시나리오**: 팀원들과 Confluence 공동 작업 시 동기화 방식

### Recommended Follow-up Techniques

- **Prototyping Session**: 간단한 PoC 플러그인으로 MCP 연동 검증
- **User Story Mapping**: 실제 사용 시나리오별 기능 우선순위 재검토
- **Technical Spike**: Confluence API 성능 테스트 (대량 페이지 조회)
- **Five Whys**: "왜 온톨로지인가?" 더 깊이 파고들기

### Questions That Emerged

- Confluence 페이지가 삭제되면 Obsidian에서도 삭제? 아니면 보존?
- 동일 제목 페이지가 여러 Space에 있을 때 파일명 충돌 해결?
- 첨부파일이 수백 MB일 때 iCloud 용량 문제는?
- Obsidian 백링크가 Confluence 페이지를 가리킬 때 처리 방법?
- 온톨로지 검증 - 그래프 품질을 어떻게 측정?

### Next Session Planning

- **Suggested topics:**
  - 구현 단계별 Technical Deep Dive (MCP 연동, 마크다운 변환 등)
  - 온톨로지 설계 세션 (태그 체계, 관계 유형 정의)
  - 사용자 시나리오 기반 테스트 계획

- **Recommended timeframe:** MVP 개발 중간 점검 (1-2주 후)

- **Preparation needed:**
  - Obsidian 플러그인 샘플 코드 분석
  - Confluence API 테스트 환경 구축
  - MCP Atlassian 서버 OAuth 설정 완료

---

*Session facilitated using the BMAD-METHOD™ brainstorming framework*
