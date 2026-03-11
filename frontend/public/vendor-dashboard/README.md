# 신일팜글래스 B2B Intelligence System 대시보드

## 프로젝트 개요
신일팜글래스의 B2B 고객 인텔리전스 및 이탈 예측 시스템을 시각화하는 대시보드입니다.  
경영진 및 전략기획팀이 전사 KPI, 고객 건강도, 평판 분석, 영업 기회를 한눈에 파악할 수 있도록 설계되었습니다.

---

## ✅ 구현된 기능

### 1. Overview (종합 상황판)
- 전사 KPI 카드 6종: 종합 평판 지수, 이탈 위험 고객, 주의 고객, 신규 기회, 관리 고객사, DART 모니터링
- 고객 건강도 추이 차트 (6개월, 라인 차트)
- 고객 건강도 분포 도넛 차트
- 이번 주 핵심 알림 목록 (6건, 중요도별 색상 구분)

### 2. Reputation Monitor (평판 분석)
- 미디어 / 재무 / 내부 / 종합 평판 지수 게이지 카드 (4종)
- 감성 트렌드 분석 차트 (12개월, 긍정/부정/중립)
- 미디어 노출 추이 차트 (탭 전환)
- 미디어 카테고리 분포 도넛 차트
- 키워드 워드클라우드 (긍정/부정/전체 탭 전환)
- 주요 이슈 TOP 5 리스트
- 재무 건전성 지표 (DART 공시 기반, 6종)

### 3. Customer Health (고객 현황)
- 고객사 검색 + 상태 필터(전체/위험/주의/건강) + 정렬
- 고객사 테이블 (신호등 🔴🟡🟢, 건강도 바, 이탈 위험도, 발주 추이, 신호 태그)
- 고객 상세 팝업 (모달): 건강 진단서 — 점수 요약, 발주량 스파크라인, 위험 신호 목록, AI 권장 대응 전략
- 이탈 위험 고객 요인 분석 레이더 차트
- 발주량 변동 TOP 5 가로 바 차트

### 4. Opportunity Pipeline (영업 기회)
- 기회 KPI 요약 (긴급/높음/보통/예상매출)
- 3열 칸반 보드 (긴급 4건 / 높음 5건 / 보통 3건)
- 각 기회 카드: 회사명, 트리거, 설명, 출처, 날짜, 예상 매출, 액션 버튼
- 기회 발굴 소스 파이 차트
- 기회 유형별 예상 매출 바 차트

### 공통 기능
- 다크 테마 사이드바 네비게이션
- 반응형 레이아웃 (모바일 지원)
- 토스트 알림 시스템
- 실시간 시간 표시

---

## 📁 파일 구조

```
index.html          — 메인 HTML 구조 (4개 섹션)
css/
  style.css         — 전체 스타일 (다크 테마, 반응형)
js/
  data.js           — 고객/기회/차트 Mock 데이터
  charts.js         — Chart.js 기반 차트 초기화 로직
  app.js            — 네비게이션, 필터, 모달, 파이프라인 렌더링
```

---

## 🗂️ 데이터 모델 (Mock)

### customers[]
| 필드 | 타입 | 설명 |
|------|------|------|
| id | number | 고객사 ID |
| name | string | 고객사명 |
| type | string | 업종 (제약/화장품) |
| status | 'red'\|'yellow'\|'green' | 건강 상태 |
| healthScore | number | 건강도 점수 (0-100) |
| riskPct | number | 이탈 위험도 (%) |
| orderTrend | number | 발주량 변화율 (%) |
| lastContact | string | 최근 접촉일 |
| signals | string[] | 감지된 신호 태그 |
| revenue | string | 연간 거래액 |
| details | object | 상세 진단 정보 |

### opportunities[]
| 필드 | 타입 | 설명 |
|------|------|------|
| id | number | 기회 ID |
| priority | 'urgent'\|'high'\|'medium' | 우선순위 |
| company | string | 대상 기업 |
| trigger | string | 발굴 트리거 |
| desc | string | 기회 설명 |
| amount | string | 예상 매출 |
| source | string | 데이터 출처 |
| date | string | 감지 날짜 |
| action | string | 권장 액션 |

---

## 🔧 미구현 기능 (향후 개발 권장)

- [ ] 실시간 DART 공시 API 연동
- [ ] 실제 CRM 데이터 연동
- [ ] 이메일/슬랙 알림 발송 기능
- [ ] 고객사 추가/편집 기능 (CRUD)
- [ ] 보고서 PDF 내보내기
- [ ] 사용자 인증 및 권한 관리
- [ ] 12주 구현 로드맵 Gantt 차트

---

## 🌐 진입 경로

| 경로 | 설명 |
|------|------|
| `/` `index.html` | 메인 대시보드 (Overview 기본 진입) |
| `?section=reputation` | 평판 분석 탭 |
| `?section=customer` | 고객 현황 탭 |
| `?section=opportunity` | 영업 기회 탭 |

---

## 🛠️ 사용 기술

- HTML5 / CSS3 / Vanilla JavaScript
- [Chart.js](https://www.chartjs.org/) — 차트 시각화
- [Font Awesome 6](https://fontawesome.com/) — 아이콘
- [Noto Sans KR](https://fonts.google.com/) — 한글 폰트
- 다크 테마 디자인 시스템

---

*버전: 1.0 | 기준일: 2024년 5월 20일*
