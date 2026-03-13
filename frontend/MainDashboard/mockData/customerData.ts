export type CustomerStatus = "red" | "yellow" | "green";

export type CustomerRiskFactor = {
  label: string;
  icon: string;
  value: string;
  severity: "red" | "yellow" | "green";
};

export type CustomerDetail = {
  founded: string;
  employees: string;
  mainProduct: string;
  orderHistory: number[];
  riskFactors: CustomerRiskFactor[];
  actions: string[];
};

export type CustomerItem = {
  id: number;
  name: string;
  type: string;
  status: CustomerStatus;
  healthScore: number;
  riskPct: number;
  orderTrend: number;
  lastContact: string;
  signals: string[];
  revenue: string;
  details: CustomerDetail;
};

export type CustomerRadarSeries = {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  pointBackgroundColor: string;
};

export type CustomerRadarChartData = {
  labels: string[];
  datasets: CustomerRadarSeries[];
};

export type CustomerOrderChangeData = {
  companies: string[];
  changes: number[];
};

export const customerList: CustomerItem[] = [
  {
    id: 1,
    name: "한미약품",
    type: "제약",
    status: "red",
    healthScore: 31,
    riskPct: 87,
    orderTrend: -23,
    lastContact: "15일 전",
    signals: ["경쟁사 접촉", "발주 감소", "담당자 교체"],
    revenue: "142억",
    details: {
      founded: "1973년",
      employees: "4,200명",
      mainProduct: "앰플·바이알",
      orderHistory: [320, 310, 305, 285, 260, 247],
      riskFactors: [
        { label: "발주량 감소", icon: "📉", value: "-23% (3개월 연속)", severity: "red" },
        { label: "담당자 교체", icon: "👤", value: "구매팀 팀장 교체 확인", severity: "red" },
        { label: "경쟁사 접촉", icon: "🔍", value: "A사 견적서 수령 정황", severity: "red" },
        { label: "입찰 불참", icon: "📋", value: "최근 입찰 2회 불참", severity: "yellow" },
        { label: "미팅 거절", icon: "🚫", value: "정기 미팅 1회 취소", severity: "yellow" },
      ],
      actions: [
        "즉시 임원급 관계 미팅 주선 (이번 주 내)",
        "가격 경쟁력 재검토 및 특별 조건 제안",
        "품질 우수성 보고서 및 GMP 인증 자료 제공",
        "담당 영업 1:1 관계 재구축 집중",
      ],
    },
  },
  {
    id: 2,
    name: "동아ST",
    type: "제약",
    status: "red",
    healthScore: 38,
    riskPct: 79,
    orderTrend: -14,
    lastContact: "8일 전",
    signals: ["입찰 불참", "품질 클레임"],
    revenue: "98억",
    details: {
      founded: "1957년",
      employees: "3,100명",
      mainProduct: "바이알",
      orderHistory: [210, 215, 208, 200, 190, 180],
      riskFactors: [
        { label: "입찰 불참", icon: "📋", value: "2분기 2회 입찰 불참", severity: "red" },
        { label: "품질 클레임", icon: "⚠️", value: "바이알 불량률 클레임 1건", severity: "red" },
        { label: "발주 감소", icon: "📉", value: "-14% (2개월 연속)", severity: "yellow" },
      ],
      actions: [
        "품질 클레임 즉시 처리 및 재발방지 보고서 제출",
        "품질 개선 현황 공유 미팅 진행",
        "전략적 파트너십 협약 제안",
      ],
    },
  },
  {
    id: 3,
    name: "일동제약",
    type: "제약",
    status: "red",
    healthScore: 42,
    riskPct: 65,
    orderTrend: -9,
    lastContact: "20일 전",
    signals: ["소통 단절", "발주 감소"],
    revenue: "76억",
    details: {
      founded: "1941년",
      employees: "1,800명",
      mainProduct: "앰플",
      orderHistory: [170, 168, 162, 158, 155, 154],
      riskFactors: [
        { label: "소통 단절", icon: "📵", value: "20일간 담당자 연락 두절", severity: "red" },
        { label: "발주 감소", icon: "📉", value: "-9% (2개월)", severity: "yellow" },
      ],
      actions: [
        "담당자 직접 방문 면담 추진",
        "관계 개선을 위한 사은 행사 초청",
        "신제품 샘플 제공 및 기술 지원 강화",
      ],
    },
  },
  {
    id: 4,
    name: "보령제약",
    type: "제약",
    status: "yellow",
    healthScore: 61,
    riskPct: 42,
    orderTrend: 5,
    lastContact: "3일 전",
    signals: ["임상 3상 진입", "경쟁사 접촉"],
    revenue: "115억",
    details: {
      founded: "1963년",
      employees: "2,400명",
      mainProduct: "바이알",
      orderHistory: [230, 228, 235, 238, 242, 248],
      riskFactors: [
        { label: "경쟁사 접촉", icon: "🔍", value: "B사 견적 비교 중", severity: "yellow" },
        { label: "임상 3상 진입", icon: "🧪", value: "신규 제품 → 수요 증가 예상", severity: "green" },
      ],
      actions: [
        "임상 3상 신제품 대상 맞춤 바이알 제안",
        "경쟁사 대비 가격·품질 경쟁력 자료 제시",
        "장기 계약 조건 협상 준비",
      ],
    },
  },
  {
    id: 5,
    name: "녹십자",
    type: "제약",
    status: "yellow",
    healthScore: 58,
    riskPct: 38,
    orderTrend: -4,
    lastContact: "6일 전",
    signals: ["미디어 부정", "수익성 저하"],
    revenue: "201억",
    details: {
      founded: "1967년",
      employees: "5,800명",
      mainProduct: "앰플·바이알",
      orderHistory: [420, 415, 408, 410, 405, 402],
      riskFactors: [
        { label: "미디어 부정 급증", icon: "📰", value: "2주간 부정 기사 +15건", severity: "yellow" },
        { label: "재무 수익성 저하", icon: "💰", value: "영업이익률 -3.2%p", severity: "yellow" },
      ],
      actions: [
        "미디어 위기 상황 공감 메시지 전달",
        "장기 공급 안정성 강조 미팅",
        "비용 절감 패키지 제안",
      ],
    },
  },
  {
    id: 6,
    name: "종근당",
    type: "제약",
    status: "yellow",
    healthScore: 66,
    riskPct: 28,
    orderTrend: 8,
    lastContact: "2일 전",
    signals: ["공장 착공", "수요 증가"],
    revenue: "178억",
    details: {
      founded: "1941년",
      employees: "3,200명",
      mainProduct: "앰플",
      orderHistory: [360, 362, 368, 374, 380, 389],
      riskFactors: [
        { label: "공장 착공 DART 공시", icon: "🏭", value: "충북 오창 신공장 착공 → 기회", severity: "green" },
      ],
      actions: [
        "신공장 앰플 공급 장기계약 선제 제안",
        "생산 용량 확대 로드맵 공유",
      ],
    },
  },
  {
    id: 7,
    name: "유한양행",
    type: "제약",
    status: "green",
    healthScore: 84,
    riskPct: 12,
    orderTrend: 11,
    lastContact: "1일 전",
    signals: ["발주 증가", "장기계약"],
    revenue: "224억",
    details: {
      founded: "1926년",
      employees: "4,100명",
      mainProduct: "앰플·바이알",
      orderHistory: [450, 460, 475, 485, 498, 510],
      riskFactors: [
        { label: "관계 안정적", icon: "✅", value: "장기 공급 계약 갱신 완료", severity: "green" },
      ],
      actions: ["정기 관계 유지 미팅 지속", "신제품 라인 추가 공급 협의"],
    },
  },
  {
    id: 8,
    name: "대웅제약",
    type: "제약",
    status: "green",
    healthScore: 79,
    riskPct: 15,
    orderTrend: 6,
    lastContact: "4일 전",
    signals: ["발주 안정", "신제품 논의"],
    revenue: "162억",
    details: {
      founded: "1945년",
      employees: "2,900명",
      mainProduct: "바이알",
      orderHistory: [320, 325, 330, 334, 340, 346],
      riskFactors: [
        { label: "신제품 논의 진행 중", icon: "🆕", value: "주사제 신규 라인 협의", severity: "green" },
      ],
      actions: ["신제품 맞춤 바이알 샘플 제공", "기술 미팅 일정 조율"],
    },
  },
  {
    id: 9,
    name: "JW중외제약",
    type: "제약",
    status: "green",
    healthScore: 77,
    riskPct: 18,
    orderTrend: 3,
    lastContact: "5일 전",
    signals: ["발주 안정"],
    revenue: "88억",
    details: {
      founded: "1945년",
      employees: "1,600명",
      mainProduct: "앰플",
      orderHistory: [175, 178, 180, 181, 184, 186],
      riskFactors: [],
      actions: ["정기 관계 유지", "추가 수요 파악"],
    },
  },
  {
    id: 10,
    name: "코스맥스",
    type: "화장품",
    status: "green",
    healthScore: 88,
    riskPct: 8,
    orderTrend: 18,
    lastContact: "1일 전",
    signals: ["설비증설", "수요 급증"],
    revenue: "134억",
    details: {
      founded: "1992년",
      employees: "3,500명",
      mainProduct: "화장품 앰플",
      orderHistory: [265, 280, 298, 315, 330, 355],
      riskFactors: [
        { label: "설비 증설 공시", icon: "🏭", value: "화장품 앰플 라인 신설", severity: "green" },
      ],
      actions: ["증설 라인 전용 공급 계약 협의", "우선 공급 파트너 지위 확보"],
    },
  },
  {
    id: 11,
    name: "한국콜마",
    type: "화장품",
    status: "yellow",
    healthScore: 63,
    riskPct: 34,
    orderTrend: -6,
    lastContact: "10일 전",
    signals: ["경쟁사 탐색", "발주 소폭 감소"],
    revenue: "97억",
    details: {
      founded: "1990년",
      employees: "2,800명",
      mainProduct: "화장품 앰플",
      orderHistory: [190, 188, 185, 181, 180, 178],
      riskFactors: [
        { label: "경쟁사 탐색", icon: "🔍", value: "대체 공급사 견적 비교 중", severity: "yellow" },
      ],
      actions: ["관계 강화 방문 미팅 진행", "맞춤 패키지 가격 제안"],
    },
  },
  {
    id: 12,
    name: "엘지생활건강",
    type: "화장품",
    status: "green",
    healthScore: 81,
    riskPct: 14,
    orderTrend: 9,
    lastContact: "3일 전",
    signals: ["발주 증가", "신제품 협의"],
    revenue: "186억",
    details: {
      founded: "2001년",
      employees: "6,200명",
      mainProduct: "프리미엄 앰플",
      orderHistory: [380, 385, 392, 400, 412, 422],
      riskFactors: [],
      actions: ["프리미엄 라인 공동 개발 제안", "장기 계약 갱신 준비"],
    },
  },
];

export const customerRadarChartData: CustomerRadarChartData = {
  labels: ["발주 감소", "담당자 교체", "경쟁사 접촉", "클레임 발생", "소통 단절", "입찰 불참"],
  datasets: [
    {
      label: "한미약품",
      data: [90, 85, 80, 60, 55, 70],
      borderColor: "#ef4444",
      backgroundColor: "rgba(239,68,68,0.15)",
      pointBackgroundColor: "#ef4444",
    },
    {
      label: "동아ST",
      data: [65, 40, 50, 75, 30, 85],
      borderColor: "#f59e0b",
      backgroundColor: "rgba(245,158,11,0.10)",
      pointBackgroundColor: "#f59e0b",
    },
    {
      label: "일동제약",
      data: [55, 30, 35, 20, 80, 40],
      borderColor: "#a855f7",
      backgroundColor: "rgba(168,85,247,0.10)",
      pointBackgroundColor: "#a855f7",
    },
  ],
};

export const customerOrderChangeData: CustomerOrderChangeData = {
  companies: ["코스맥스", "유한양행", "종근당", "한미약품", "동아ST"],
  changes: [18, 11, 8, -23, -14],
};