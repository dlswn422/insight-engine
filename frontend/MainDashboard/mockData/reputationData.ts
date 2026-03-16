export type ReputationScoreCard = {
  key: "media" | "finance" | "internal" | "total";
  label: string;
  value: number;
  trendText: string;
  trendType: "positive" | "negative" | "warning";
  highlight?: boolean;
};

export type SentimentTrendData = {
  labels: string[];
  positive: number[];
  negative: number[];
  neutral: number[];
};

export type MediaTrendData = {
  labels: string[];
  count: number[];
};

export type MediaCategoryData = {
  labels: string[];
  values: number[];
};

export type WordCloudWord = {
  text: string;
  size: number;
  color: string;
};

export type WordCloudGroup = {
  positive: WordCloudWord[];
  negative: WordCloudWord[];
  all: WordCloudWord[];
};

export type IssueItem = {
  rank: number;
  title: string;
  type: "positive" | "negative";
  tagText: string;
  meta: string;
  score: string;
};

export type FinanceMetric = {
  label: string;
  value: string;
  change: string;
  changeType: "positive" | "negative";
  barWidth: string;
  warning?: boolean;
};

export const reputationScoreCards: ReputationScoreCard[] = [
  {
    key: "media",
    label: "미디어 평판",
    value: 82,
    trendText: "+4.1",
    trendType: "positive",
  },
  {
    key: "finance",
    label: "재무 건전성",
    value: 71,
    trendText: "보통",
    trendType: "warning",
  },
  {
    key: "internal",
    label: "내부 평판",
    value: 84,
    trendText: "+2.3",
    trendType: "positive",
  },
  {
    key: "total",
    label: "종합 평판 지수",
    value: 78,
    trendText: "+3.2",
    trendType: "positive",
    highlight: true,
  },
];

export const reputationSentimentTrend: SentimentTrendData = {
  labels: ["6월", "7월", "8월", "9월", "10월", "11월", "12월", "1월", "2월", "3월", "4월", "5월"],
  positive: [62, 65, 68, 71, 74, 70, 73, 76, 74, 78, 80, 82],
  negative: [28, 25, 22, 20, 18, 22, 19, 17, 20, 16, 14, 13],
  neutral: [10, 10, 10, 9, 8, 8, 8, 7, 6, 6, 6, 5],
};

export const reputationMediaTrend: MediaTrendData = {
  labels: ["6월", "7월", "8월", "9월", "10월", "11월", "12월", "1월", "2월", "3월", "4월", "5월"],
  count: [14, 18, 22, 17, 24, 20, 28, 32, 25, 38, 42, 47],
};

export const reputationMediaCategory: MediaCategoryData = {
  labels: ["경영/전략", "R&D/기술", "수출/해외", "품질/인증", "ESG", "재무"],
  values: [28, 22, 18, 16, 10, 6],
};

export const reputationWordCloud: WordCloudGroup = {
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
    { text: "ISO 인증", size: 20, color: "#4ade80" },
  ],
  negative: [
    { text: "납기 지연", size: 32, color: "#f87171" },
    { text: "원자재 수급", size: 28, color: "#ef4444" },
    { text: "가격 인상", size: 26, color: "#f87171" },
    { text: "불량률", size: 22, color: "#fca5a5" },
    { text: "공급 불안", size: 24, color: "#ef4444" },
    { text: "경쟁 심화", size: 20, color: "#f87171" },
    { text: "인력 부족", size: 18, color: "#fca5a5" },
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
    { text: "R&D 투자", size: 22, color: "#a5b4fc" },
  ],
};

export const reputationIssues: IssueItem[] = [
  {
    rank: 1,
    title: "GMP 국제 인증 획득",
    type: "positive",
    tagText: "긍정",
    meta: "미디어 38건 · 2024.05.01",
    score: "+12.4",
  },
  {
    rank: 2,
    title: "수출 계약 400억 달성",
    type: "positive",
    tagText: "긍정",
    meta: "미디어 22건 · 2024.04.18",
    score: "+8.7",
  },
  {
    rank: 3,
    title: "친환경 앰플 라인 도입",
    type: "positive",
    tagText: "긍정",
    meta: "미디어 17건 · 2024.03.22",
    score: "+5.2",
  },
  {
    rank: 4,
    title: "납기 지연 민원 접수",
    type: "negative",
    tagText: "부정",
    meta: "내부 클레임 3건 · 2024.04.29",
    score: "-3.8",
  },
  {
    rank: 5,
    title: "원자재 수급 불안 우려",
    type: "negative",
    tagText: "부정",
    meta: "뉴스 8건 · 2024.05.10",
    score: "-2.1",
  },
];

export const reputationFinanceMetrics: FinanceMetric[] = [
  {
    label: "매출액",
    value: "1,284억 원",
    change: "+7.3% YoY",
    changeType: "positive",
    barWidth: "78%",
  },
  {
    label: "영업이익률",
    value: "8.4%",
    change: "+1.2%p",
    changeType: "positive",
    barWidth: "60%",
  },
  {
    label: "부채비율",
    value: "142%",
    change: "+12%p",
    changeType: "negative",
    barWidth: "55%",
    warning: true,
  },
  {
    label: "유동비율",
    value: "183%",
    change: "+18%p",
    changeType: "positive",
    barWidth: "73%",
  },
  {
    label: "수출 비중",
    value: "31.4%",
    change: "+5.2%p",
    changeType: "positive",
    barWidth: "31%",
  },
  {
    label: "R&D 투자비",
    value: "62억 원",
    change: "+22% YoY",
    changeType: "positive",
    barWidth: "45%",
  },
];