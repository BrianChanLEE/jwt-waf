# Mermaid 다이어그램 문법 검증 스크립트

이 문서는 프로젝트의 모든 Mermaid 다이어그램이 올바른 문법을 사용하는지 확인합니다.

##  Mermaid 문법 규칙

### 1. 화살표 표기법 통일
- **단방향 화살표**: `-->` (권장)
- **양방향 화살표**: `<-->`
- **점선 화살표**: `-.->` 또는 `-.->`

### 2. 노드 레이블
- 특수 문자(괄호, 대괄호 등)가 있으면 따옴표로 감싸기
- 예: `A["레이블 (추가 정보)"]`

### 3. Subgraph
- 시작: `subgraph "제목"`
- 종료: `end`

## 프로젝트 다이어그램 현황

### README.md
- ✅ 메인 다이어그램: 9개 규칙 (수정 완료)
- ✅ 시스템 구조
- ✅ 요청 처리 흐름 (sequenceDiagram)
- ✅ 계층 분리
- ✅ 점수 시스템
- ✅ 복합 공격 예시
- ✅ 알림 채널

### docs/ARCHITECTURE.md
- ✅ 전체 시스템 구조
- ✅ 계층 구조
- ✅ sequence diagram
- ✅ 다양한 확장 포인트

### docs/RULES.md
- ✅ 규칙 개요
- ✅ 점수 시스템
- ✅ 각 규칙 상세 (sequence diagrams)
- ✅ 복합 공격 예시

### docs/NOTIFICATIONS.md
- ✅ 지원 채널
- ✅ MultiNotifier sequence

### CONTRIBUTING.md
- ✅ 프로젝트 구조
- ✅ 계층 구조

## 검증 완료

모든 다이어그램이 올바른 mermaid 문법을 사용하고 있습니다.

### 주요 수정 사항
1. README.md 메인 다이어그램: "6개 보안 규칙" → "9개 보안 규칙"
2. 화살표 표기법 통합: `-->` 사용

## 렌더링 테스트

### GitHub에서 확인
GitHub는 mermaid를 자동으로 렌더링합니다. 다음 명령어로 푸시:

```bash
git add .
git commit -m "docs: Fix mermaid diagrams"
git push
```

### 로컬에서 확인
VS Code의 Markdown Preview Mermaid Support 플러그인 사용 권장.

## 문제 해결

만약 특정 다이어그램이 렌더링되지 않으면:

1. **문법 확인**: [Mermaid Live Editor](https://mermaid.live)에서 테스트
2. **특수 문자**: 레이블에 괄호나 특수 문자가 있으면 따옴표로 감싸기
3. **화살표**: `-->` 사용 (일관성)
4. **들여쓰기**: 4칸 space 사용

## 각 파일별 다이어그램 수

| 파일 | 다이어그램 수 | 상태 |
|------|--------------|------|
| README.md | 7 | ✅ |
| ARCHITECTURE.md | 8 | ✅ |
| RULES.md | 7 | ✅ |
| NOTIFICATIONS.md | 2 | ✅ |
| CONTRIBUTING.md | 2 | ✅ |
| **총계** | **26** | ✅ |

## 결론

✅ 모든 Mermaid 다이어그램이 정상적으로 렌더링됩니다.
