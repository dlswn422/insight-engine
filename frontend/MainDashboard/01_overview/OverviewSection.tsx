"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";

type SectionType =
  | "overview"
  | "reputation"
  | "customer"
  | "opportunity";

type Props = {
  setActiveSection: (section: SectionType) => void;
};

type OverviewResponse = {
  kpis: {
    compositeIndex: number;
    riskHighCount: number;
    riskMedCount: number;
    oppHighCount: number;
    totalCompanies: number;
    dartCount: number;
  };
  distribution: {
    healthy: number;
    warning: number;
    danger: number;
  };
  alerts: Array<{
    id: string;
    company_name: string;
    title: string;
    subtitle: string;
    updated_at: string;
    confidence_score: number;
    actionType: "detail" | "opportunity" | "analysis";
    buttonLabel: string;
  }>;
  trend: {
    labels: string[];
    healthy: number[];
    warning: number[];
    danger: number[];
  };
};

const EMPTY_DATA: OverviewResponse = {
  kpis: {
    compositeIndex: 0,
    riskHighCount: 0,
    riskMedCount: 0,
    oppHighCount: 0,
    totalCompanies: 0,
    dartCount: 0,
  },
  distribution: {
    healthy: 0,
    warning: 0,
    danger: 0,
  },
  alerts: [],
  trend: {
    labels: [],
    healthy: [],
    warning: [],
    danger: [],
  },
};

function formatAlertTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getOverviewKpiSubtext(
  key:
    | "composite"
    | "riskHigh"
    | "riskMed"
    | "oppHigh"
    | "totalCompanies"
    | "dart",
  data: OverviewResponse
) {
  switch (key) {
    case "composite":
      return `위험 ${data.kpis.riskHighCount} · 기회 ${data.kpis.oppHighCount}`;
    case "riskHigh":
      return data.kpis.riskHighCount > 0
        ? `즉시 대응 필요 ${data.kpis.riskHighCount}개사`
        : "즉시 대응 대상 없음";
    case "riskMed":
      return data.kpis.riskMedCount > 0
        ? `모니터링 대상 ${data.kpis.riskMedCount}개사`
        : "모니터링 대상 없음";
    case "oppHigh":
      return data.kpis.oppHighCount > 0
        ? `즉시 영업 후보 ${data.kpis.oppHighCount}건`
        : "신규 기회 없음";
    case "totalCompanies":
      return `활성 관리 ${data.kpis.totalCompanies}개사`;
    case "dart":
      return data.kpis.dartCount > 0
        ? `최근 공시 ${data.kpis.dartCount}건`
        : "최근 공시 없음";
    default:
      return "-";
  }
}

function getOverviewKpiChip(
  key:
    | "composite"
    | "riskHigh"
    | "riskMed"
    | "oppHigh"
    | "totalCompanies"
    | "dart",
  data: OverviewResponse
) {
  switch (key) {
    case "composite":
      return data.kpis.compositeIndex >= 75
        ? "양호"
        : data.kpis.compositeIndex >= 55
        ? "보통"
        : "주의";
    case "riskHigh":
      return data.kpis.riskHighCount > 0 ? "긴급" : "안정";
    case "riskMed":
      return data.kpis.riskMedCount > 0 ? "모니터링" : "안정";
    case "oppHigh":
      return data.kpis.oppHighCount > 0 ? "즉시 영업" : "대기";
    case "totalCompanies":
      return "고객군";
    case "dart":
      return data.kpis.dartCount > 0 ? "활성" : "없음";
    default:
      return "-";
  }
}

export default function OverviewSection({ setActiveSection }: Props) {
  const [data, setData] = useState<OverviewResponse>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);

  const trendCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const doughnutCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await fetch("/api/overview");
        const json = await res.json();

        if (!res.ok) {
          console.error("Overview API error:", json);
          setData(EMPTY_DATA);
          return;
        }

        setData({
          kpis: json?.kpis ?? EMPTY_DATA.kpis,
          distribution: json?.distribution ?? EMPTY_DATA.distribution,
          alerts: Array.isArray(json?.alerts) ? json.alerts : [],
          trend: json?.trend ?? EMPTY_DATA.trend,
        });
      } catch (e) {
        console.error("Failed to fetch overview:", e);
        setData(EMPTY_DATA);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  useEffect(() => {
    if (!trendCanvasRef.current || !doughnutCanvasRef.current || loading) return;

    const trendChart = new Chart(trendCanvasRef.current, {
      type: "line",
      data: {
        labels: data.trend.labels,
        datasets: [
          {
            label: "건강",
            data: data.trend.healthy,
            borderColor: "rgba(16, 185, 129, 1)",
            backgroundColor: "rgba(16, 185, 129, 0.10)",
            tension: 0.35,
            fill: true,
            pointRadius: 3,
            pointBackgroundColor: "rgba(16, 185, 129, 1)",
          },
          {
            label: "주의",
            data: data.trend.warning,
            borderColor: "rgba(245, 185, 66, 1)",
            backgroundColor: "rgba(245, 185, 66, 0.08)",
            tension: 0.35,
            fill: false,
            pointRadius: 3,
            pointBackgroundColor: "rgba(245, 185, 66, 1)",
          },
          {
            label: "위험",
            data: data.trend.danger,
            borderColor: "rgba(255, 93, 115, 1)",
            backgroundColor: "rgba(255, 93, 115, 0.08)",
            tension: 0.35,
            fill: false,
            pointRadius: 3,
            pointBackgroundColor: "rgba(255, 93, 115, 1)",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            position: "top",
            align: "end",
            labels: {
              color: "#c7d2e3",
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              pointStyle: "circle",
            },
          },
        },
        scales: {
          x: {
            grid: { color: "rgba(255,255,255,0.06)" },
            ticks: { color: "#94a3b8" },
          },
          y: {
            beginAtZero: true,
            grid: { color: "rgba(255,255,255,0.06)" },
            ticks: { color: "#94a3b8", stepSize: 10 },
          },
        },
      },
    });

    const doughnutChart = new Chart(doughnutCanvasRef.current, {
      type: "doughnut",
      data: {
        labels: ["건강", "주의", "위험"],
        datasets: [
          {
            data: [
              data.distribution.healthy,
              data.distribution.warning,
              data.distribution.danger,
            ],
            backgroundColor: [
              "rgba(34,197,94,0.88)",
              "rgba(245,185,66,0.88)",
              "rgba(255,93,115,0.88)",
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        cutout: "68%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#c7d2e3",
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              pointStyle: "circle",
            },
          },
        },
      },
    });

    return () => {
      trendChart.destroy();
      doughnutChart.destroy();
    };
  }, [data, loading]);

  const alertCount = useMemo(() => data.alerts.length, [data.alerts]);

  const handleAlertAction = (
    actionType: "detail" | "opportunity" | "analysis"
  ) => {
    if (actionType === "detail") {
      setActiveSection("customer");
      return;
    }

    if (actionType === "opportunity") {
      setActiveSection("opportunity");
      return;
    }

    setActiveSection("reputation");
  };

  const kpiCards = [
    {
      key: "composite" as const,
      title: "종합 평판 지수",
      value: `${data.kpis.compositeIndex.toFixed(1)}`,
      sub: getOverviewKpiSubtext("composite", data),
      chip: getOverviewKpiChip("composite", data),
      accent: "purple",
      icon: "fa-chart-simple",
    },
    {
      key: "riskHigh" as const,
      title: "이탈 위험 고객",
      value: `${data.kpis.riskHighCount}개사`,
      sub: getOverviewKpiSubtext("riskHigh", data),
      chip: getOverviewKpiChip("riskHigh", data),
      accent: "red",
      icon: "fa-triangle-exclamation",
    },
    {
      key: "riskMed" as const,
      title: "주의 관찰 고객",
      value: `${data.kpis.riskMedCount}개사`,
      sub: getOverviewKpiSubtext("riskMed", data),
      chip: getOverviewKpiChip("riskMed", data),
      accent: "yellow",
      icon: "fa-eye",
    },
    {
      key: "oppHigh" as const,
      title: "신규 기회 건수",
      value: `${data.kpis.oppHighCount}건`,
      sub: getOverviewKpiSubtext("oppHigh", data),
      chip: getOverviewKpiChip("oppHigh", data),
      accent: "green",
      icon: "fa-bullseye",
    },
    {
      key: "totalCompanies" as const,
      title: "총 관리 고객사",
      value: `${data.kpis.totalCompanies}개사`,
      sub: getOverviewKpiSubtext("totalCompanies", data),
      chip: getOverviewKpiChip("totalCompanies", data),
      accent: "blue",
      icon: "fa-folder-open",
    },
    {
      key: "dart" as const,
      title: "DART 모니터링",
      value: `${data.kpis.dartCount}건`,
      sub: getOverviewKpiSubtext("dart", data),
      chip: getOverviewKpiChip("dart", data),
      accent: "violet",
      icon: "fa-file-circle-plus",
    },
  ];

  return (
    <section className="section active" id="section-overview">
      <div className="section-header">
        <h1>
          <i className="fas fa-table-cells-large"></i> 전사 종합 상황판
        </h1>
        <p>신일팜글라스 B2B Intelligence 핵심 KPI 실시간 현황</p>
      </div>

      {loading ? (
        <div className="chart-card" style={{ padding: "24px" }}>
          불러오는 중...
        </div>
      ) : (
        <>
          <div className="overview-kpi-grid-v2">
            {kpiCards.map((card) => (
              <div
                key={card.key}
                className={`overview-kpi-card-v2 overview-accent-${card.accent}`}
              >
                <div className="overview-kpi-top">
                  <div className={`overview-kpi-icon overview-icon-${card.accent}`}>
                    <i className={`fas ${card.icon}`}></i>
                  </div>
                  <div className={`overview-kpi-chip chip-${card.accent}`}>
                    {card.chip}
                  </div>
                </div>

                <div className="overview-kpi-title-v2">{card.title}</div>
                <div className="overview-kpi-value-v2">{card.value}</div>
                <div className="overview-kpi-sub-v2">{card.sub}</div>
              </div>
            ))}
          </div>

          <div className="overview-chart-row-v2">
            <div className="chart-card overview-chart-card-v2 overview-trend-card">
              <div className="chart-header">
                <h3>
                  <i className="fas fa-chart-line"></i> 고객 건강도 추이
                </h3>
                <span className="overview-mini-chip">6개월</span>
              </div>
              <div className="overview-chart-canvas-wrap-v2">
                <canvas ref={trendCanvasRef}></canvas>
              </div>
            </div>

            <div className="chart-card overview-chart-card-v2 overview-doughnut-card">
              <div className="chart-header">
                <h3>
                  <i className="fas fa-chart-pie"></i> 건강도 분포
                </h3>
              </div>
              <div className="overview-chart-canvas-wrap-v2 doughnut-wrap">
                <canvas ref={doughnutCanvasRef}></canvas>
              </div>
              <div className="overview-distribution-legend">
                <div className="overview-legend-item">
                  <span className="dot healthy"></span>
                  건강 ({data.distribution.healthy})
                </div>
                <div className="overview-legend-item">
                  <span className="dot warning"></span>
                  주의 ({data.distribution.warning})
                </div>
                <div className="overview-legend-item">
                  <span className="dot danger"></span>
                  위험 ({data.distribution.danger})
                </div>
              </div>
            </div>
          </div>

          <div className="chart-card overview-alert-card-v2">
            <div className="chart-header">
              <div className="overview-alert-title-wrap">
                <h3>
                  <i className="fas fa-bell"></i> 이번 주 핵심 알림
                </h3>
                <span className="overview-alert-badge-v2">{alertCount}건</span>
              </div>
            </div>

            <div className="overview-alert-list-v2">
              {data.alerts.map((alert, idx) => {
                const tone =
                  idx % 4 === 0
                    ? "danger"
                    : idx % 4 === 1
                    ? "danger"
                    : idx % 4 === 2
                    ? "warning"
                    : "success";

                return (
                  <div
                    key={alert.id}
                    className={`overview-alert-item-v2 tone-${tone}`}
                  >
                    <div className="overview-alert-left-v2">
                      <div className={`overview-alert-dot-v2 ${tone}`}>
                        <i
                          className={`fas ${
                            tone === "danger"
                              ? "fa-circle-exclamation"
                              : tone === "warning"
                              ? "fa-flask"
                              : "fa-industry"
                          }`}
                        ></i>
                      </div>

                      <div className="overview-alert-content-v2">
                        <div className="overview-alert-title-v2">
                          {alert.company_name} — {alert.title}
                        </div>
                        <div className="overview-alert-subtitle-v2">
                          {alert.subtitle}
                        </div>
                      </div>
                    </div>

                    <div className="overview-alert-right-v2">
                      <div className="overview-alert-time-v2">
                        {formatAlertTime(alert.updated_at)}
                      </div>
                      <button
                        type="button"
                        className="overview-alert-btn-v2"
                        onClick={() => handleAlertAction(alert.actionType)}
                      >
                        {alert.buttonLabel}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}