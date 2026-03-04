/* =========================================
   data.js — 신일팜글래스 B2B Intelligence
   Mock Data for Dashboard
   ========================================= */

const DATA = {

  /* ─── CUSTOMER HEALTH DATA ─── */
  customers: [
    {
      id: 1, name: "한미약품", type: "제약", status: "red",
      healthScore: 31, riskPct: 87,
      orderTrend: -23, lastContact: "15일 전",
      signals: ["경쟁사 접촉", "발주 감소", "담당자 교체"],
      revenue: "142억",
      details: {
        founded: "1973년", employees: "4,200명", mainProduct: "앰플·바이알",
        orderHistory: [320, 310, 305, 285, 260, 247],
        riskFactors: [
          { label: "발주량 감소", icon: "📉", value: "-23% (3개월 연속)", severity: "red" },
          { label: "담당자 교체", icon: "👤", value: "구매팀 팀장 교체 확인", severity: "red" },
          { label: "경쟁사 접촉", icon: "🔍", value: "A사 견적서 수령 정황", severity: "red" },
          { label: "입찰 불참", icon: "📋", value: "최근 입찰 2회 불참", severity: "yellow" },
          { label: "미팅 거절", icon: "🚫", value: "정기 미팅 1회 취소", severity: "yellow" }
        ],
        actions: [
          "즉시 임원급 관계 미팅 주선 (이번 주 내)",
          "가격 경쟁력 재검토 및 특별 조건 제안",
          "품질 우수성 보고서 및 GMP 인증 자료 제공",
          "담당 영업 1:1 관계 재구축 집중"
        ]
      }
    },
    {
      id: 2, name: "동아ST", type: "제약", status: "red",
      healthScore: 38, riskPct: 79,
      orderTrend: -14, lastContact: "8일 전",
      signals: ["입찰 불참", "품질 클레임"],
      revenue: "98억",
      details: {
        founded: "1957년", employees: "3,100명", mainProduct: "바이알",
        orderHistory: [210, 215, 208, 200, 190, 180],
        riskFactors: [
          { label: "입찰 불참", icon: "📋", value: "2분기 2회 입찰 불참", severity: "red" },
          { label: "품질 클레임", icon: "⚠️", value: "바이알 불량률 클레임 1건", severity: "red" },
          { label: "발주 감소", icon: "📉", value: "-14% (2개월 연속)", severity: "yellow" }
        ],
        actions: [
          "품질 클레임 즉시 처리 및 재발방지 보고서 제출",
          "품질 개선 현황 공유 미팅 진행",
          "전략적 파트너십 협약 제안"
        ]
      }
    },
    {
      id: 3, name: "일동제약", type: "제약", status: "red",
      healthScore: 42, riskPct: 65,
      orderTrend: -9, lastContact: "20일 전",
      signals: ["소통 단절", "발주 감소"],
      revenue: "76억",
      details: {
        founded: "1941년", employees: "1,800명", mainProduct: "앰플",
        orderHistory: [170, 168, 162, 158, 155, 154],
        riskFactors: [
          { label: "소통 단절", icon: "📵", value: "20일간 담당자 연락 두절", severity: "red" },
          { label: "발주 감소", icon: "📉", value: "-9% (2개월)", severity: "yellow" }
        ],
        actions: [
          "담당자 직접 방문 면담 추진",
          "관계 개선을 위한 사은 행사 초청",
          "신제품 샘플 제공 및 기술 지원 강화"
        ]
      }
    },
    {
      id: 4, name: "보령제약", type: "제약", status: "yellow",
      healthScore: 61, riskPct: 42,
      orderTrend: +5, lastContact: "3일 전",
      signals: ["임상 3상 진입", "경쟁사 접촉"],
      revenue: "115억",
      details: {
        founded: "1963년", employees: "2,400명", mainProduct: "바이알",
        orderHistory: [230, 228, 235, 238, 242, 248],
        riskFactors: [
          { label: "경쟁사 접촉", icon: "🔍", value: "B사 견적 비교 중", severity: "yellow" },
          { label: "임상 3상 진입", icon: "🧪", value: "신규 제품 → 수요 증가 예상", severity: "green" }
        ],
        actions: [
          "임상 3상 신제품 대상 맞춤 바이알 제안",
          "경쟁사 대비 가격·품질 경쟁력 자료 제시",
          "장기 계약 조건 협상 준비"
        ]
      }
    },
    {
      id: 5, name: "녹십자", type: "제약", status: "yellow",
      healthScore: 58, riskPct: 38,
      orderTrend: -4, lastContact: "6일 전",
      signals: ["미디어 부정", "수익성 저하"],
      revenue: "201억",
      details: {
        founded: "1967년", employees: "5,800명", mainProduct: "앰플·바이알",
        orderHistory: [420, 415, 408, 410, 405, 402],
        riskFactors: [
          { label: "미디어 부정 급증", icon: "📰", value: "2주간 부정 기사 +15건", severity: "yellow" },
          { label: "재무 수익성 저하", icon: "💰", value: "영업이익률 -3.2%p", severity: "yellow" }
        ],
        actions: [
          "미디어 위기 상황 공감 메시지 전달",
          "장기 공급 안정성 강조 미팅",
          "비용 절감 패키지 제안"
        ]
      }
    },
    {
      id: 6, name: "종근당", type: "제약", status: "yellow",
      healthScore: 66, riskPct: 28,
      orderTrend: +8, lastContact: "2일 전",
      signals: ["공장 착공", "수요 증가"],
      revenue: "178억",
      details: {
        founded: "1941년", employees: "3,200명", mainProduct: "앰플",
        orderHistory: [360, 362, 368, 374, 380, 389],
        riskFactors: [
          { label: "공장 착공 DART 공시", icon: "🏭", value: "충북 오창 신공장 착공 → 기회", severity: "green" }
        ],
        actions: [
          "신공장 앰플 공급 장기계약 선제 제안",
          "생산 용량 확대 로드맵 공유"
        ]
      }
    },
    {
      id: 7, name: "유한양행", type: "제약", status: "green",
      healthScore: 84, riskPct: 12,
      orderTrend: +11, lastContact: "1일 전",
      signals: ["발주 증가", "장기계약"],
      revenue: "224억",
      details: {
        founded: "1926년", employees: "4,100명", mainProduct: "앰플·바이알",
        orderHistory: [450, 460, 475, 485, 498, 510],
        riskFactors: [
          { label: "관계 안정적", icon: "✅", value: "장기 공급 계약 갱신 완료", severity: "green" }
        ],
        actions: ["정기 관계 유지 미팅 지속", "신제품 라인 추가 공급 협의"]
      }
    },
    {
      id: 8, name: "대웅제약", type: "제약", status: "green",
      healthScore: 79, riskPct: 15,
      orderTrend: +6, lastContact: "4일 전",
      signals: ["발주 안정", "신제품 논의"],
      revenue: "162억",
      details: {
        founded: "1945년", employees: "2,900명", mainProduct: "바이알",
        orderHistory: [320, 325, 330, 334, 340, 346],
        riskFactors: [
          { label: "신제품 논의 진행 중", icon: "🆕", value: "주사제 신규 라인 협의", severity: "green" }
        ],
        actions: ["신제품 맞춤 바이알 샘플 제공", "기술 미팅 일정 조율"]
      }
    },
    {
      id: 9, name: "JW중외제약", type: "제약", status: "green",
      healthScore: 77, riskPct: 18,
      orderTrend: +3, lastContact: "5일 전",
      signals: ["발주 안정"],
      revenue: "88억",
      details: {
        founded: "1945년", employees: "1,600명", mainProduct: "앰플",
        orderHistory: [175, 178, 180, 181, 184, 186],
        riskFactors: [],
        actions: ["정기 관계 유지", "추가 수요 파악"]
      }
    },
    {
      id: 10, name: "코스맥스", type: "화장품", status: "green",
      healthScore: 88, riskPct: 8,
      orderTrend: +18, lastContact: "1일 전",
      signals: ["설비증설", "수요 급증"],
      revenue: "134억",
      details: {
        founded: "1992년", employees: "3,500명", mainProduct: "화장품 앰플",
        orderHistory: [265, 280, 298, 315, 330, 355],
        riskFactors: [
          { label: "설비 증설 공시", icon: "🏭", value: "화장품 앰플 라인 신설", severity: "green" }
        ],
        actions: ["증설 라인 전용 공급 계약 협의", "우선 공급 파트너 지위 확보"]
      }
    },
    {
      id: 11, name: "한국콜마", type: "화장품", status: "yellow",
      healthScore: 63, riskPct: 34,
      orderTrend: -6, lastContact: "10일 전",
      signals: ["경쟁사 탐색", "발주 소폭 감소"],
      revenue: "97억",
      details: {
        founded: "1990년", employees: "2,800명", mainProduct: "화장품 앰플",
        orderHistory: [190, 188, 185, 181, 180, 178],
        riskFactors: [
          { label: "경쟁사 탐색", icon: "🔍", value: "대체 공급사 견적 비교 중", severity: "yellow" }
        ],
        actions: ["관계 강화 방문 미팅 진행", "맞춤 패키지 가격 제안"]
      }
    },
    {
      id: 12, name: "엘지생활건강", type: "화장품", status: "green",
      healthScore: 81, riskPct: 14,
      orderTrend: +9, lastContact: "3일 전",
      signals: ["발주 증가", "신제품 협의"],
      revenue: "186억",
      details: {
        founded: "2001년", employees: "6,200명", mainProduct: "프리미엄 앰플",
        orderHistory: [380, 385, 392, 400, 412, 422],
        riskFactors: [],
        actions: ["프리미엄 라인 공동 개발 제안", "장기 계약 갱신 준비"]
      }
    }
  ],

  /* ─── OPPORTUNITY PIPELINE ─── */
  opportunities: [
    {
      id: 1, priority: "urgent",
      company: "보령제약", trigger: "임상 3상 진입",
      desc: "신규 주사제 임상 3상 승인 → 바이알 1,200만개/년 수요 예상",
      amount: "약 8.4억/년", source: "식약처 공시",
      date: "2024.05.18", product: "바이알 20mL",
      action: "이번 주 영업팀 접촉"
    },
    {
      id: 2, priority: "urgent",
      company: "종근당", trigger: "공장 착공",
      desc: "충북 오창 신규 공장 착공 DART 공시 → 앰플 1,200만개/년 기회",
      amount: "약 7.2억/년", source: "DART 공시",
      date: "2024.05.16", product: "앰플 2mL·5mL",
      action: "이번 주 영업팀 접촉"
    },
    {
      id: 3, priority: "urgent",
      company: "코스맥스", trigger: "설비 증설",
      desc: "화장품 앰플 생산라인 신설 발표 → 즉시 공급 계약 필요",
      amount: "약 6.8억/년", source: "뉴스·공시",
      date: "2024.05.15", product: "화장품 앰플",
      action: "즉시 계약 협상"
    },
    {
      id: 4, priority: "urgent",
      company: "삼성바이오에피스", trigger: "바이오시밀러 승인",
      desc: "FDA 바이오시밀러 품목허가 → 대량 바이알 수요 발생",
      amount: "약 12억/년", source: "FDA 공시",
      date: "2024.05.12", product: "바이알 10mL",
      action: "임원 미팅 주선"
    },
    {
      id: 5, priority: "high",
      company: "동화약품", trigger: "신공장 허가",
      desc: "경기 평택 신공장 건축 허가 접수 → 앰플 수요 600만개/년 예상",
      amount: "약 4.2억/년", source: "지자체 건축 허가",
      date: "2024.05.10", product: "앰플 1mL",
      action: "1주 내 접촉"
    },
    {
      id: 6, priority: "high",
      company: "에이치엘비", trigger: "항암 신약 3상",
      desc: "간암 신약 3상 진행 → 주사제 바이알 대규모 수요 발생 가능",
      amount: "약 5.6억/년", source: "임상 등록 DB",
      date: "2024.05.09", product: "바이알 5mL",
      action: "1주 내 접촉"
    },
    {
      id: 7, priority: "high",
      company: "광동제약", trigger: "생산라인 확장",
      desc: "비타민 주사제 라인 2배 확장 계획 → 앰플 수요 대폭 증가",
      amount: "약 3.8억/년", source: "업계 뉴스",
      date: "2024.05.07", product: "앰플 10mL",
      action: "1주 내 접촉"
    },
    {
      id: 8, priority: "high",
      company: "아모레퍼시픽", trigger: "앰플 신제품 출시",
      desc: "프리미엄 스킨케어 앰플 라인업 확장 → 고급 용기 수요 증가",
      amount: "약 4.5억/년", source: "신제품 발표",
      date: "2024.05.06", product: "화장품 앰플 고급형",
      action: "1주 내 접촉"
    },
    {
      id: 9, priority: "high",
      company: "셀트리온", trigger: "수출 계약",
      desc: "유럽 수출용 바이오의약품 패키징 공급사 선정 예정",
      amount: "약 9.1억/년", source: "DART 공시",
      date: "2024.05.04", product: "바이알 2mL",
      action: "제안서 제출 준비"
    },
    {
      id: 10, priority: "medium",
      company: "한독", trigger: "M&A 후 통합",
      desc: "자회사 통합으로 생산 통합 예상 → 공급사 재검토 시기",
      amount: "약 2.8억/년", source: "업계 뉴스",
      date: "2024.05.02", product: "앰플 혼합",
      action: "추이 관찰 후 접촉"
    },
    {
      id: 11, priority: "medium",
      company: "신풍제약", trigger: "코로나 치료제 허가",
      desc: "경구용 코로나 치료제 허가 신청 → 주사제 수요 보조 가능성",
      amount: "약 2.2억/년", source: "식약처 신청",
      date: "2024.04.29", product: "바이알 10mL",
      action: "추이 관찰"
    },
    {
      id: 12, priority: "medium",
      company: "카버코리아", trigger: "K뷰티 수출 확대",
      desc: "미국·유럽 수출 확대에 따른 앰플 패키징 수요 증가",
      amount: "약 3.1억/년", source: "수출 실적 데이터",
      date: "2024.04.25", product: "화장품 앰플",
      action: "추이 관찰 후 접촉"
    }
  ],

  /* ─── CHART DATA ─── */
  healthTrend: {
    labels: ["12월", "1월", "2월", "3월", "4월", "5월"],
    green: [36, 37, 38, 38, 39, 39],
    yellow: [6,  6,  5,  6,  5,  5],
    red:   [3,  3,  3,  2,  3,  3]
  },

  sentimentTrend: {
    labels: ["6월","7월","8월","9월","10월","11월","12월","1월","2월","3월","4월","5월"],
    positive: [62, 65, 68, 71, 74, 70, 73, 76, 74, 78, 80, 82],
    negative: [28, 25, 22, 20, 18, 22, 19, 17, 20, 16, 14, 13],
    neutral:  [10, 10, 10,  9,  8,  8,  8,  7,  6,  6,  6,  5]
  },

  mediaTrend: {
    labels: ["6월","7월","8월","9월","10월","11월","12월","1월","2월","3월","4월","5월"],
    count: [14, 18, 22, 17, 24, 20, 28, 32, 25, 38, 42, 47]
  },

  mediaCategory: {
    labels: ["경영/전략", "R&D/기술", "수출/해외", "품질/인증", "ESG", "재무"],
    values: [28, 22, 18, 16, 10, 6]
  },

  orderChange: {
    companies: ["코스맥스", "유한양행", "종근당", "한미약품", "동아ST"],
    changes: [+18, +11, +8, -23, -14]
  },

  oppSource: {
    labels: ["DART 공시", "식약처 공시", "임상 DB", "업계 뉴스", "입찰 정보", "내부 정보"],
    values: [32, 24, 20, 12, 8, 4]
  },

  oppRevenue: {
    labels: ["바이알 (제약)", "앰플 (제약)", "화장품 앰플", "바이오의약품", "수출용"],
    values: [14.2, 9.8, 7.6, 4.2, 2.4]
  },

  /* ─── WORDCLOUD DATA ─── */
  wordcloud: {
    positive: [
      { text: "GMP 인증", size: 36, color: "#4ade80" },
      { text: "품질 우수", size: 30, color: "#22c55e" },
      { text: "납기 준수", size: 28, color: "#4ade80" },
      { text: "수출 성장", size: 34, color: "#22c55e" },
      { text: "기술 혁신", size: 24, color: "#86efac" },
      { text: "ESG", size: 20, color: "#4ade80" },
      { text: "친환경", size: 22, color: "#86efac" },
      { text: "신뢰성", size: 26, color: "#22c55e" },
      { text: "원스톱", size: 18, color: "#4ade80" },
      { text: "R&D 투자", size: 22, color: "#86efac" },
      { text: "글로벌", size: 28, color: "#22c55e" },
      { text: "ISO 인증", size: 20, color: "#4ade80" }
    ],
    negative: [
      { text: "납기 지연", size: 32, color: "#f87171" },
      { text: "원자재 수급", size: 28, color: "#ef4444" },
      { text: "가격 인상", size: 26, color: "#f87171" },
      { text: "불량률", size: 22, color: "#fca5a5" },
      { text: "공급 불안", size: 24, color: "#ef4444" },
      { text: "경쟁 심화", size: 20, color: "#f87171" },
      { text: "인력 부족", size: 18, color: "#fca5a5" }
    ],
    all: [
      { text: "GMP 인증", size: 36, color: "#4ade80" },
      { text: "수출 성장", size: 34, color: "#22c55e" },
      { text: "품질 우수", size: 30, color: "#4ade80" },
      { text: "납기 지연", size: 32, color: "#f87171" },
      { text: "납기 준수", size: 28, color: "#22c55e" },
      { text: "기술 혁신", size: 24, color: "#818cf8" },
      { text: "원자재 수급", size: 28, color: "#f87171" },
      { text: "ESG", size: 20, color: "#4ade80" },
      { text: "신뢰성", size: 26, color: "#22c55e" },
      { text: "가격 인상", size: 26, color: "#fca5a5" },
      { text: "글로벌", size: 28, color: "#818cf8" },
      { text: "ISO 인증", size: 20, color: "#86efac" },
      { text: "공급 불안", size: 24, color: "#f87171" },
      { text: "R&D 투자", size: 22, color: "#a5b4fc" }
    ]
  }
};
