"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";

type OpportunitySummary = {
  urgentCount: number;
  highCount: number;
  mediumCount: number;
  totalCount: number;
  topSizeCount: number;
};

type OpportunityItem = {
  id: string;
  priority: "urgent" | "high" | "medium";
  company: string;
  trigger: string;
  desc: string;
  sizeLabel: string;
  sizeRank: number;
  source: string;
  date: string;
  product: string;
  action: string;
};

type OpportunityResponse = {
  summary: OpportunitySummary;
  items: OpportunityItem[];
  sourceData: {
    labels: string[];
    values: number[];
  };
  sizeData: {
    labels: string[];
    values: number[];
  };
};

const EMPTY_DATA: OpportunityResponse = {
  summary: {
    urgentCount: 0,
    highCount: 0,
    mediumCount: 0,
    totalCount: 0,
    topSizeCount: 0,
  },
  items: [],
  sourceData: {
    labels: [],
    values: [],
  },
  sizeData: {
    labels: [],
    values: [],
  },
};

function groupByPriority(items: OpportunityItem[]) {
  return {
    urgent: items.filter((item) => item.priority === "urgent"),
    high: items.filter((item) => item.priority === "high"),
    medium: items.filter((item) => item.priority === "medium"),
  };
}

export default function OpportunitySection() {
  const [data, setData] = useState<OpportunityResponse>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);

  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sizeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const fetchOpportunity = async () => {
      try {
        const res = await fetch("/api/opportunities");
        const json = await res.json();

        if (!res.ok) {
          console.error("Opportunity API error:", json);
          setData(EMPTY_DATA);
          return;
        }

        setData({
          summary: {
            urgentCount: json?.summary?.urgentCount ?? 0,
            highCount: json?.summary?.highCount ?? 0,
            mediumCount: json?.summary?.mediumCount ?? 0,
            totalCount: json?.summary?.totalCount ?? 0,
            topSizeCount: json?.summary?.topSizeCount ?? 0,
          },
          items: Array.isArray(json?.items) ? json.items : [],
          sourceData: {
            labels: Array.isArray(json?.sourceData?.labels)
              ? json.sourceData.labels
              : [],
            values: Array.isArray(json?.sourceData?.values)
              ? json.sourceData.values
              : [],
          },
          sizeData: {
            labels: Array.isArray(json?.sizeData?.labels)
              ? json.sizeData.labels
              : [],
            values: Array.isArray(json?.sizeData?.values)
              ? json.sizeData.values
              : [],
          },
        });
      } catch (e) {
        console.error("Failed to fetch opportunities:", e);
        setData(EMPTY_DATA);
      } finally {
        setLoading(false);
      }
    };

    fetchOpportunity();
  }, []);

  const grouped = useMemo(() => groupByPriority(data.items), [data.items]);

  useEffect(() => {
    if (!sourceCanvasRef.current || !sizeCanvasRef.current || loading) return;

    const sourceChart = new Chart(sourceCanvasRef.current, {
      type: "doughnut",
      data: {
        labels: data.sourceData.labels,
        datasets: [
          {
            data: data.sourceData.values,
            backgroundColor: [
              "rgba(29, 155, 209, 0.88)",
              "rgba(59,130,246,0.88)",
              "rgba(16,185,129,0.88)",
              "rgba(245,185,66,0.88)",
              "rgba(244,63,94,0.88)",
              "rgba(168,85,247,0.88)",
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        cutout: "58%",
        plugins: {
          legend: {
            position: "right",
            labels: {
              color: "#c7d2e3",
              boxWidth: 10,
              boxHeight: 10,
            },
          },
        },
      },
    });

    const sizeChart = new Chart(sizeCanvasRef.current, {
      type: "bar",
      data: {
        labels: data.sizeData.labels,
        datasets: [
          {
            label: "기회 규모",
            data: data.sizeData.values,
            backgroundColor: [
              "rgba(29, 155, 209, 0.85)",
              "rgba(16,185,129,0.85)",
              "rgba(202,138,4,0.85)",
              "rgba(225,29,72,0.75)",
              "rgba(59,130,246,0.85)",
            ],
            borderRadius: 8,
            maxBarThickness: 72,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            grid: { color: "rgba(255,255,255,0.04)" },
            ticks: { color: "#94a3b8" },
          },
          y: {
            beginAtZero: true,
            grid: { color: "rgba(255,255,255,0.06)" },
            ticks: {
              color: "#94a3b8",
            },
          },
        },
      },
    });

    return () => {
      sourceChart.destroy();
      sizeChart.destroy();
    };
  }, [data.sourceData, data.sizeData, loading]);

  return (
    <section className="section active" id="section-opportunity">
      <div className="section-header">
        <h1>
          <i className="fas fa-rocket"></i> Opportunity Pipeline
        </h1>
        <p>AI 기반 신규 영업 기회 자동 발굴 현황</p>
      </div>

      {loading ? (
        <div className="chart-card" style={{ padding: "24px" }}>
          불러오는 중...
        </div>
      ) : (
        <>
          <div className="opp-kpi-row">
            <div className="opp-kpi">
              <div className="opp-kpi-icon urgent">
                <i className="fas fa-fire"></i>
              </div>
              <div className="opp-kpi-copy">
                <div className="opp-kpi-value">{data.summary.urgentCount}건</div>
                <div className="opp-kpi-label">긴급 — 즉시 접촉</div>
              </div>
            </div>

            <div className="opp-kpi">
              <div className="opp-kpi-icon high">
                <i className="fas fa-bolt"></i>
              </div>
              <div className="opp-kpi-copy">
                <div className="opp-kpi-value">{data.summary.highCount}건</div>
                <div className="opp-kpi-label">높음 — 1주 내 접촉</div>
              </div>
            </div>

            <div className="opp-kpi">
              <div className="opp-kpi-icon medium">
                <i className="fas fa-hourglass-half"></i>
              </div>
              <div className="opp-kpi-copy">
                <div className="opp-kpi-value">{data.summary.mediumCount}건</div>
                <div className="opp-kpi-label">보통 — 추이 관찰</div>
              </div>
            </div>

            <div className="opp-kpi">
              <div className="opp-kpi-icon revenue">
                <i className="fas fa-layer-group"></i>
              </div>
              <div className="opp-kpi-copy">
                <div className="opp-kpi-value">{data.summary.topSizeCount}건</div>
                <div className="opp-kpi-label-row">
                  <div className="opp-kpi-label">기회 규모 상</div>
                  <span className="metric-badge metric-badge-ai">추정 분류</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pipeline-meta-note">
            우선순위와 기회 규모는 최근 신호 기반 규칙/AI 추정 지표입니다.
          </div>

          <div className="pipeline-stage-headers">
            <div className="ps-header ps-urgent">
              <span className="ps-dot urgent"></span>
              긴급 ({grouped.urgent.length})
            </div>
            <div className="ps-header ps-high">
              <span className="ps-dot high"></span>
              높음 ({grouped.high.length})
            </div>
            <div className="ps-header ps-medium">
              <span className="ps-dot medium"></span>
              보통 ({grouped.medium.length})
            </div>
          </div>

          <div className="pipeline-board">
            <div className="pipeline-col urgent">
              {grouped.urgent.map((item) => (
                <div key={item.id} className="opp-card urgent">
                  <div className="opp-card-header">
                    <div className="opp-company">{item.company}</div>
                    <div className="opp-amount">{item.sizeLabel}</div>
                  </div>

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "10px",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "5px 10px",
                        borderRadius: "999px",
                        background: "rgba(24,144,255,0.12)",
                        color: "#2ea7ff",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      <i
                        className="fas fa-bolt"
                        style={{ marginRight: "6px", fontSize: "11px" }}
                      ></i>
                      {item.product}
                    </span>
                  </div>

                  <div className="opp-trigger">{item.trigger}</div>
                  <div className="opp-desc">{item.desc}</div>

                  <div className="opp-footer">
                    <span className="opp-source">
                      <i className="fas fa-database"></i> {item.source}
                    </span>
                    <span className="opp-date">{item.date}</span>
                  </div>

                  <button type="button" className="opp-action-btn">
                    <i className="fas fa-paper-plane"></i> {item.action}
                  </button>
                </div>
              ))}
            </div>

            <div className="pipeline-col high">
              {grouped.high.map((item) => (
                <div key={item.id} className="opp-card high">
                  <div className="opp-card-header">
                    <div className="opp-company">{item.company}</div>
                    <div className="opp-amount">{item.sizeLabel}</div>
                  </div>

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "10px",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "5px 10px",
                        borderRadius: "999px",
                        background: "rgba(24,144,255,0.12)",
                        color: "#2ea7ff",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      <i
                        className="fas fa-bolt"
                        style={{ marginRight: "6px", fontSize: "11px" }}
                      ></i>
                      {item.product}
                    </span>
                  </div>

                  <div className="opp-trigger">{item.trigger}</div>
                  <div className="opp-desc">{item.desc}</div>

                  <div className="opp-footer">
                    <span className="opp-source">
                      <i className="fas fa-database"></i> {item.source}
                    </span>
                    <span className="opp-date">{item.date}</span>
                  </div>

                  <button type="button" className="opp-action-btn">
                    <i className="fas fa-paper-plane"></i> {item.action}
                  </button>
                </div>
              ))}
            </div>

            <div className="pipeline-col medium">
              {grouped.medium.map((item) => (
                <div key={item.id} className="opp-card medium">
                  <div className="opp-card-header">
                    <div className="opp-company">{item.company}</div>
                    <div className="opp-amount">{item.sizeLabel}</div>
                  </div>

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "10px",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "5px 10px",
                        borderRadius: "999px",
                        background: "rgba(24,144,255,0.12)",
                        color: "#2ea7ff",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      <i
                        className="fas fa-bolt"
                        style={{ marginRight: "6px", fontSize: "11px" }}
                      ></i>
                      {item.product}
                    </span>
                  </div>

                  <div className="opp-trigger">{item.trigger}</div>
                  <div className="opp-desc">{item.desc}</div>

                  <div className="opp-footer">
                    <span className="opp-source">
                      <i className="fas fa-database"></i> {item.source}
                    </span>
                    <span className="opp-date">{item.date}</span>
                  </div>

                  <button type="button" className="opp-action-btn">
                    <i className="fas fa-paper-plane"></i> {item.action}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.3fr",
              gap: "18px",
              marginTop: "18px",
            }}
          >
            <div className="chart-card" style={{ padding: "20px" }}>
              <div className="chart-header">
                <h3>
                  <i className="fas fa-database"></i> 기회 발굴 소스
                </h3>
              </div>
              <div style={{ position: "relative", height: "280px" }}>
                <canvas ref={sourceCanvasRef}></canvas>
              </div>
            </div>

            <div className="chart-card" style={{ padding: "20px" }}>
              <div className="chart-header">
                <h3>
                  <i className="fas fa-chart-bar"></i> 유형별 기회 규모
                </h3>
              </div>
              <div style={{ position: "relative", height: "280px" }}>
                <canvas ref={sizeCanvasRef}></canvas>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}