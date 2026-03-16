"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import CustomerHealthModal from "./CustomerHealthModal";

type HealthStatus = "danger" | "warning" | "healthy";

type FactorScores = {
  order_drop: number;
  contact_gap: number;
  competitor_touch: number;
  claim_issue: number;
  bid_miss: number;
  owner_change: number;
};

type HealthItem = {
  company_name: string;
  status: HealthStatus;
  health_score: number;
  churn_risk: number;
  risk_score: number;
  opportunity_score: number;
  risk_delta: number;
  opportunity_delta: number;
  signal_tags: string[];
  updated_at: string;
  order_trend: number;
  factors: FactorScores;
};

type ApiResponse = {
  items: HealthItem[];
};

function deriveIndustryLabel(item: HealthItem) {
  const text = `${item.company_name} ${item.signal_tags.join(" ")}`.toLowerCase();

  if (
    text.includes("제약") ||
    text.includes("약품") ||
    text.includes("바이오") ||
    text.includes("임상") ||
    text.includes("의약") ||
    text.includes("허가")
  ) {
    return "제약";
  }

  if (
    text.includes("화장품") ||
    text.includes("뷰티") ||
    text.includes("코스")
  ) {
    return "뷰티";
  }

  if (
    text.includes("금융") ||
    text.includes("은행") ||
    text.includes("증권") ||
    text.includes("카드")
  ) {
    return "금융";
  }

  if (
    text.includes("반도체") ||
    text.includes("전자") ||
    text.includes("칩")
  ) {
    return "반도체";
  }

  return "제약";
}

function formatDaysAgo(value?: string) {
  if (!value) return "-";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  const diffMs = Date.now() - d.getTime();
  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  if (days === 0) return "오늘";
  return `${days}일 전`;
}

function getHealthBarTone(status: HealthStatus) {
  if (status === "danger") return "rgba(255,93,115,1)";
  if (status === "warning") return "rgba(245,185,66,1)";
  return "rgba(34,197,94,1)";
}

function getRiskPillTone(value: number) {
  if (value >= 70) return "danger";
  if (value >= 40) return "warning";
  return "healthy";
}

function formatTrendValue(value: number) {
  if (value > 0) return `+${value}%`;
  if (value < 0) return `${value}%`;
  return "0%";
}

function getTrendTone(value: number) {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
}

function emphasizeRadarValue(value: number) {
  if (value <= 0) return 0;
  return Math.min(4, Number(Math.max(0.8, value * 1.6).toFixed(1)));
}

export default function CustomerHealthSection() {
  const [items, setItems] = useState<HealthItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | HealthStatus>("all");
  const [sortKey, setSortKey] = useState<"risk" | "health" | "name">("risk");
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const barCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch("/api/customer-health");
        const json: ApiResponse | { error?: string } = await res.json();

        if (!res.ok) {
          console.error("Customer Health API error:", json);
          setItems([]);
          return;
        }

        setItems(
          Array.isArray((json as ApiResponse)?.items)
            ? (json as ApiResponse).items
            : []
        );
      } catch (e) {
        console.error("Failed to fetch customer health:", e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
  }, []);

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter((item) =>
        item.company_name.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((item) => item.status === statusFilter);
    }

    result.sort((a, b) => {
      if (sortKey === "risk") return b.churn_risk - a.churn_risk;
      if (sortKey === "health") return a.health_score - b.health_score;
      return a.company_name.localeCompare(b.company_name, "ko");
    });

    return result;
  }, [items, query, statusFilter, sortKey]);

  const statusCounts = useMemo(() => {
    return {
      all: items.length,
      danger: items.filter((i) => i.status === "danger").length,
      warning: items.filter((i) => i.status === "warning").length,
      healthy: items.filter((i) => i.status === "healthy").length,
    };
  }, [items]);

  const dangerTop3 = useMemo(() => {
    return [...items]
      .filter((i) => i.status === "danger" || i.status === "warning")
      .sort((a, b) => b.churn_risk - a.churn_risk)
      .slice(0, 3);
  }, [items]);

  const orderTop5 = useMemo(() => {
    const positives = [...items]
      .filter((i) => i.order_trend > 0)
      .sort((a, b) => b.order_trend - a.order_trend)
      .slice(0, 3);

    const negatives = [...items]
      .filter((i) => i.order_trend < 0)
      .sort((a, b) => a.order_trend - b.order_trend)
      .slice(0, 2);

    return [...positives, ...negatives];
  }, [items]);

  useEffect(() => {
    if (!radarCanvasRef.current || !barCanvasRef.current) return;

    const radarChart = new Chart(radarCanvasRef.current, {
      type: "radar",
      data: {
        labels: [
          "발주 감소",
          "담당자 교체",
          "경쟁사 접촉",
          "클레임 발생",
          "소통 단절",
          "입찰 불참",
        ],
        datasets: dangerTop3.map((item, idx) => {
          const colors = [
            { border: "rgba(255,93,115,1)", fill: "rgba(255,93,115,0.12)" },
            { border: "rgba(245,185,66,1)", fill: "rgba(245,185,66,0.12)" },
            { border: "rgba(168,85,247,1)", fill: "rgba(168,85,247,0.12)" },
          ][idx] || {
            border: "rgba(59,130,246,1)",
            fill: "rgba(59,130,246,0.12)",
          };

          return {
            label: item.company_name,
            data: [
              emphasizeRadarValue(item.factors.order_drop),
              emphasizeRadarValue(item.factors.owner_change),
              emphasizeRadarValue(item.factors.competitor_touch),
              emphasizeRadarValue(item.factors.claim_issue),
              emphasizeRadarValue(item.factors.contact_gap),
              emphasizeRadarValue(item.factors.bid_miss),
            ],
            borderColor: colors.border,
            backgroundColor: colors.fill,
            borderWidth: 2,
            pointRadius: 3,
          };
        }),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          r: {
            beginAtZero: true,
            max: 4,
            angleLines: { color: "rgba(255,255,255,0.08)" },
            grid: { color: "rgba(255,255,255,0.08)" },
            pointLabels: { color: "#94a3b8", font: { size: 11 } },
            ticks: {
              backdropColor: "transparent",
              color: "#64748b",
              stepSize: 1,
            },
          },
        },
        plugins: {
          legend: {
            labels: {
              color: "#c7d2e3",
            },
          },
        },
      },
    });

    const barChart = new Chart(barCanvasRef.current, {
      type: "bar",
      data: {
        labels: orderTop5.map((i) => i.company_name),
        datasets: [
          {
            data: orderTop5.map((i) => i.order_trend),
            backgroundColor: orderTop5.map((i) =>
              i.order_trend < 0
                ? "rgba(255,93,115,0.75)"
                : "rgba(34,197,94,0.75)"
            ),
            borderRadius: 8,
            maxBarThickness: 38,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            min: -25,
            max: 20,
            grid: { color: "rgba(255,255,255,0.06)" },
            ticks: {
              color: "#94a3b8",
              callback: (value) => `${value}%`,
            },
          },
          y: {
            grid: { display: false },
            ticks: { color: "#94a3b8" },
          },
        },
      },
    });

    return () => {
      radarChart.destroy();
      barChart.destroy();
    };
  }, [dangerTop3, orderTop5]);

  return (
    <section className="section active" id="section-customer">
      <div className="section-header">
        <h1>
          <i className="fas fa-users"></i> Customer Health
        </h1>
        <p>주요 고객사 건강도 실시간 모니터링</p>
      </div>

      {loading ? (
        <div className="chart-card" style={{ padding: "24px" }}>
          불러오는 중...
        </div>
      ) : (
        <>
          <div className="health-toolbar">
            <div className="health-search-wrap">
              <i className="fas fa-search"></i>
              <input
                className="health-search-input"
                placeholder="고객사 검색..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="health-toolbar-right">
              <div className="health-filter-chips">
                <button
                  className={`health-chip ${statusFilter === "all" ? "active" : ""}`}
                  onClick={() => setStatusFilter("all")}
                >
                  전체 {statusCounts.all}
                </button>
                <button
                  className={`health-chip danger ${statusFilter === "danger" ? "active" : ""}`}
                  onClick={() => setStatusFilter("danger")}
                >
                  위험 {statusCounts.danger}
                </button>
                <button
                  className={`health-chip warning ${statusFilter === "warning" ? "active" : ""}`}
                  onClick={() => setStatusFilter("warning")}
                >
                  주의 {statusCounts.warning}
                </button>
                <button
                  className={`health-chip healthy ${statusFilter === "healthy" ? "active" : ""}`}
                  onClick={() => setStatusFilter("healthy")}
                >
                  건강 {statusCounts.healthy}
                </button>
              </div>

              <select
                className="health-sort-select"
                value={sortKey}
                onChange={(e) =>
                  setSortKey(e.target.value as "risk" | "health" | "name")
                }
              >
                <option value="risk">위험도 순</option>
                <option value="health">건강도 낮은 순</option>
                <option value="name">이름순</option>
              </select>
            </div>
          </div>

          <div className="chart-card health-table-card" style={{ padding: 0 }}>
            <table className="health-table">
              <thead>
                <tr>
                  <th>상태</th>
                  <th>고객사</th>
                  <th>업종</th>
                  <th>건강도</th>
                  <th>이탈 위험</th>
                  <th>발주 추이</th>
                  <th>감지 신호</th>
                  <th>최근 접촉</th>
                  <th>진단서</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => {
                    const trendTone = getTrendTone(item.order_trend);
                    const riskTone = getRiskPillTone(item.churn_risk);

                    return (
                      <tr key={item.company_name}>
                        <td>
                          <span className={`health-dot ${item.status}`}></span>
                        </td>

                        <td className="company-cell">
                          <div style={{ fontWeight: 700 }}>{item.company_name}</div>
                        </td>

                        <td>{deriveIndustryLabel(item)}</td>

                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                              minWidth: "110px",
                            }}
                          >
                            <div
                              style={{
                                width: "70px",
                                height: "6px",
                                borderRadius: "999px",
                                background: "rgba(255,255,255,0.08)",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.max(
                                    6,
                                    Math.min(100, item.health_score)
                                  )}%`,
                                  height: "100%",
                                  borderRadius: "999px",
                                  background: getHealthBarTone(item.status),
                                }}
                              ></div>
                            </div>
                            <span
                              style={{
                                fontWeight: 700,
                                color:
                                  item.status === "danger"
                                    ? "#ff5d73"
                                    : item.status === "warning"
                                    ? "#f5b942"
                                    : "#22c55e",
                              }}
                            >
                              {item.health_score}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span className={`health-chip ${riskTone}`}>
                            {item.churn_risk}%
                          </span>
                        </td>

                        <td>
                          <span
                            style={{
                              fontWeight: 700,
                              color:
                                trendTone === "up"
                                  ? "#22c55e"
                                  : trendTone === "down"
                                  ? "#ff5d73"
                                  : "#94a3b8",
                            }}
                          >
                            {trendTone === "up"
                              ? "▲ "
                              : trendTone === "down"
                              ? "▼ "
                              : ""}
                            {formatTrendValue(item.order_trend)}
                          </span>
                        </td>

                        <td>
                          <div className="signal-tag-row">
                            {item.signal_tags.slice(0, 3).map((tag, idx) => (
                              <span key={idx} className="signal-tag">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td>{formatDaysAgo(item.updated_at)}</td>

                        <td>
                          <button
                            type="button"
                            className="detail-btn"
                            onClick={() => setSelectedCompany(item.company_name)}
                          >
                            건강 진단서
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      style={{
                        textAlign: "center",
                        padding: "28px 16px",
                        color: "#7f8ea3",
                      }}
                    >
                      표시할 고객 데이터가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="customer-health-charts-row">
            <div className="chart-card customer-chart-card">
              <div className="chart-header">
                <h3>
                  <i className="fas fa-spider"></i> 이탈 요인 분석
                </h3>
                <span className="metric-badge metric-badge-derived">위험 고객</span>
              </div>
              <div className="customer-chart-canvas-wrap">
                <canvas ref={radarCanvasRef}></canvas>
              </div>
            </div>

            <div className="chart-card customer-chart-card">
              <div className="chart-header">
                <h3>
                  <i className="fas fa-chart-bar"></i> 발주량 변동 TOP 5
                </h3>
                <span className="metric-badge metric-badge-ai">전월 대비</span>
              </div>
              <div className="customer-chart-canvas-wrap">
                <canvas ref={barCanvasRef}></canvas>
              </div>
            </div>
          </div>
        </>
      )}

      {selectedCompany && (
        <CustomerHealthModal
          companyName={selectedCompany}
          onClose={() => setSelectedCompany(null)}
        />
      )}
    </section>
  );
}