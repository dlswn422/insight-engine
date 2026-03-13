export type OpportunityPriority = "urgent" | "high" | "medium";

export type OpportunityItem = {
  id: number;
  priority: OpportunityPriority;
  company: string;
  trigger: string;
  desc: string;
  amount: string;
  source: string;
  date: string;
  product: string;
  action: string;
};

export type OpportunitySourceData = {
  labels: string[];
  values: number[];
};

export type OpportunityRevenueData = {
  labels: string[];
  values: number[];
};

export const opportunityList: OpportunityItem[] = [
  {
    id: 1,
    priority: "urgent",
    company: "보령제약",
    trigger: "임상 3상 진입",
    desc: "신규 주사제 임상 3상 승인 → 바이알 1,200만개/년 수요 예상",
    amount: "약 8.4억/년",
    source: "식약처 공시",
    date: "2024.05.18",
    product: "바이알 20mL",
    action: "이번 주 영업팀 접촉",
  },
  {
    id: 2,
    priority: "urgent",
    company: "종근당",
    trigger: "공장 착공",
    desc: "충북 오창 신규 공장 착공 DART 공시 → 앰플 1,200만개/년 기회",
    amount: "약 7.2억/년",
    source: "DART 공시",
    date: "2024.05.16",
    product: "앰플 2mL·5mL",
    action: "이번 주 영업팀 접촉",
  },
  {
    id: 3,
    priority: "urgent",
    company: "코스맥스",
    trigger: "설비 증설",
    desc: "화장품 앰플 생산라인 신설 발표 → 즉시 공급 계약 필요",
    amount: "약 6.8억/년",
    source: "뉴스·공시",
    date: "2024.05.15",
    product: "화장품 앰플",
    action: "즉시 계약 협상",
  },
  {
    id: 4,
    priority: "urgent",
    company: "삼성바이오에피스",
    trigger: "바이오시밀러 승인",
    desc: "FDA 바이오시밀러 품목허가 → 대량 바이알 수요 발생",
    amount: "약 12억/년",
    source: "FDA 공시",
    date: "2024.05.12",
    product: "바이알 10mL",
    action: "임원 미팅 주선",
  },
  {
    id: 5,
    priority: "high",
    company: "동화약품",
    trigger: "신공장 허가",
    desc: "경기 평택 신공장 건축 허가 접수 → 앰플 수요 600만개/년 예상",
    amount: "약 4.2억/년",
    source: "지자체 건축 허가",
    date: "2024.05.10",
    product: "앰플 1mL",
    action: "1주 내 접촉",
  },
  {
    id: 6,
    priority: "high",
    company: "에이치엘비",
    trigger: "항암 신약 3상",
    desc: "간암 신약 3상 진행 → 주사제 바이알 대규모 수요 발생 가능",
    amount: "약 5.6억/년",
    source: "임상 등록 DB",
    date: "2024.05.09",
    product: "바이알 5mL",
    action: "1주 내 접촉",
  },
  {
    id: 7,
    priority: "high",
    company: "광동제약",
    trigger: "생산라인 확장",
    desc: "비타민 주사제 라인 2배 확장 계획 → 앰플 수요 대폭 증가",
    amount: "약 3.8억/년",
    source: "업계 뉴스",
    date: "2024.05.07",
    product: "앰플 10mL",
    action: "1주 내 접촉",
  },
  {
    id: 8,
    priority: "high",
    company: "아모레퍼시픽",
    trigger: "앰플 신제품 출시",
    desc: "프리미엄 스킨케어 앰플 라인업 확장 → 고급 용기 수요 증가",
    amount: "약 4.5억/년",
    source: "신제품 발표",
    date: "2024.05.06",
    product: "화장품 앰플 고급형",
    action: "1주 내 접촉",
  },
  {
    id: 9,
    priority: "high",
    company: "셀트리온",
    trigger: "수출 계약",
    desc: "유럽 수출용 바이오의약품 패키징 공급사 선정 예정",
    amount: "약 9.1억/년",
    source: "DART 공시",
    date: "2024.05.04",
    product: "바이알 2mL",
    action: "제안서 제출 준비",
  },
  {
    id: 10,
    priority: "medium",
    company: "한독",
    trigger: "M&A 후 통합",
    desc: "자회사 통합으로 생산 통합 예상 → 공급사 재검토 시기",
    amount: "약 2.8억/년",
    source: "업계 뉴스",
    date: "2024.05.02",
    product: "앰플 혼합",
    action: "추이 관찰 후 접촉",
  },
  {
    id: 11,
    priority: "medium",
    company: "신풍제약",
    trigger: "코로나 치료제 허가",
    desc: "경구용 코로나 치료제 허가 신청 → 주사제 수요 보조 가능성",
    amount: "약 2.2억/년",
    source: "식약처 신청",
    date: "2024.04.29",
    product: "바이알 10mL",
    action: "추이 관찰",
  },
  {
    id: 12,
    priority: "medium",
    company: "카버코리아",
    trigger: "K뷰티 수출 확대",
    desc: "미국·유럽 수출 확대에 따른 앰플 패키징 수요 증가",
    amount: "약 3.1억/년",
    source: "수출 실적 데이터",
    date: "2024.04.25",
    product: "화장품 앰플",
    action: "추이 관찰 후 접촉",
  },
];

export const opportunitySourceData: OpportunitySourceData = {
  labels: ["DART 공시", "식약처 공시", "임상 DB", "업계 뉴스", "입찰 정보", "내부 정보"],
  values: [32, 24, 20, 12, 8, 4],
};

export const opportunityRevenueData: OpportunityRevenueData = {
  labels: ["바이알 (제약)", "앰플 (제약)", "화장품 앰플", "바이오의약품", "수출용"],
  values: [14.2, 9.8, 7.6, 4.2, 2.4],
};

export const opportunitySummary = {
  urgentCount: opportunityList.filter((item) => item.priority === "urgent").length,
  highCount: opportunityList.filter((item) => item.priority === "high").length,
  mediumCount: opportunityList.filter((item) => item.priority === "medium").length,
  totalRevenueText: "약 38억",
};