"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";

type ReputationResponse = {
  scoreCards: {
    mediaScore: number;
    financeScore: number;
    internalScore: number;
    totalReputation: number;
  };
  sentimentTrend: {
    labels: string[];
    positive: number[];
    negative: number[];
    neutral: number[];
  };
  mediaCategory: Array<{
    name: string;
    value: number;
  }>;
  keywordCloud: Array<{
    text: string;
    count: number;
    weight: number;
  }>;
  topIssues: Array<{
    title: string;
    category: string;
    score: number;
    tone: "positive" | "negative";
    mentions: number;
  }>;
};

const EMPTY_DATA: ReputationResponse = {
  scoreCards: {
    mediaScore: 0,
    financeScore: 0,
    internalScore: 0,
    totalReputation: 0,
  },
  /* [MOCK_DATA_REMOVAL] 
  sentimentTrend: {
    labels: ["1월", "2월", "3월"],
    positive: [30, 45, 60],
    negative: [20, 15, 10],
    neutral: [50, 40, 30],
  },
  */
  sentimentTrend: {
    labels: [],
    positive: [],
    negative: [],
    neutral: [],
  },
  mediaCategory: [],
  keywordCloud: [],
  topIssues: [],
};

type ScoreCardProps = {
  title: string;
  score: number;
  accent: "green" | "yellow" | "violet" | "purple";
  delta: string;
};

type KeywordFilterType = "positive" | "negative" | "all";
type KeywordToneType = "positive" | "negative" | "neutral" | "violet";

function getReputationDelta(
  score: number,
  kind: "media" | "finance" | "internal" | "total"
) {
  if (kind === "finance") {
    if (score >= 80) return "매우 안정";
    if (score >= 60) return "보통";
    return "주의 필요";
  }

  if (score >= 80) return "상승세";
  if (score >= 60) return "안정";
  return "개선 필요";
}

function ScoreCard({ title, score, accent, delta }: ScoreCardProps) {
  return (
    <div className={`reputation-score-card accent-${accent}`}>
      <div className="reputation-score-card-title">{title}</div>

      <div className="reputation-score-gauge-wrap">
        <div className={`reputation-score-gauge gauge-${accent}`}>
          <div className="reputation-score-gauge-track"></div>
          <div
            className="reputation-score-gauge-fill"
            style={{ transform: `rotate(${(score / 100) * 180 - 90}deg)` }}
          ></div>
          <div className="reputation-score-gauge-center"></div>
        </div>
      </div>

      <div className="reputation-score-value">
        {score}
        <span>/100</span>
      </div>

      <div
        className={`reputation-score-delta ${
          delta.includes("보통") ? "neutral" : "positive"
        }`}
      >
        {delta}
      </div>
    </div>
  );
}

function getKeywordTone(idx: number): KeywordToneType {
  if (idx % 5 === 0) return "positive";
  if (idx % 5 === 1) return "negative";
  if (idx % 5 === 2) return "violet";
  if (idx % 5 === 3) return "positive";
  return "neutral";
}

export default function ReputationSection() {
  const [data, setData] = useState<ReputationResponse>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [keywordFilter, setKeywordFilter] =
    useState<KeywordFilterType>("all");

  const trendCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const categoryCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const fetchReputation = async () => {
      try {
        const res = await fetch("/api/reputation");
        const json = await res.json();

        if (!res.ok) {
          console.error("Reputation API error:", json);
          setData(EMPTY_DATA);
          return;
        }

        setData({
          scoreCards: json?.scoreCards ?? EMPTY_DATA.scoreCards,
          sentimentTrend: json?.sentimentTrend ?? EMPTY_DATA.sentimentTrend,
          mediaCategory: Array.isArray(json?.mediaCategory)
            ? json.mediaCategory
            : [],
          keywordCloud: Array.isArray(json?.keywordCloud)
            ? json.keywordCloud
            : [],
          topIssues: Array.isArray(json?.topIssues) ? json.topIssues : [],
        });
      } catch (e) {
        console.error("Failed to fetch reputation:", e);
        setData(EMPTY_DATA);
      } finally {
        setLoading(false);
      }
    };

    fetchReputation();
  }, []);

  useEffect(() => {
    if (!trendCanvasRef.current || !categoryCanvasRef.current || loading) return;

    const trendChart = new Chart(trendCanvasRef.current, {
      type: "line",
      data: {
        labels: data.sentimentTrend.labels,
        datasets: [
          {
            label: "긍정",
            data: data.sentimentTrend.positive,
            borderColor: "rgba(34,197,94,1)",
            backgroundColor: "rgba(34,197,94,0.10)",
            tension: 0.35,
            fill: false,
            pointRadius: 3,
          },
          {
            label: "부정",
            data: data.sentimentTrend.negative,
            borderColor: "rgba(255,93,115,1)",
            backgroundColor: "rgba(255,93,115,0.08)",
            tension: 0.35,
            fill: false,
            pointRadius: 3,
          },
          {
            label: "중립",
            data: data.sentimentTrend.neutral,
            borderColor: "rgba(96,165,250,1)",
            backgroundColor: "rgba(96,165,250,0.08)",
            tension: 0.35,
            fill: false,
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            labels: {
              color: "#c7d2e3",
            },
          },
        },
        scales: {
          x: {
            grid: { color: "rgba(255,255,255,0.06)" },
            ticks: { color: "#94a3b8" },
          },
          y: {
            min: 0,
            max: 100,
            grid: { color: "rgba(255,255,255,0.06)" },
            ticks: {
              color: "#94a3b8",
              callback: (value) => `${value}%`,
            },
          },
        },
      },
    });

    const categoryChart = new Chart(categoryCanvasRef.current, {
      type: "doughnut",
      data: {
        labels: data.mediaCategory.map((item) => item.name),
        datasets: [
          {
            data: data.mediaCategory.map((item) => item.value),
            backgroundColor: [
              "rgba(99,102,241,0.88)",
              "rgba(34,197,94,0.88)",
              "rgba(59,130,246,0.88)",
              "rgba(245,185,66,0.88)",
              "rgba(168,85,247,0.88)",
              "rgba(239,68,68,0.88)",
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        cutout: "62%",
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

    return () => {
      trendChart.destroy();
      categoryChart.destroy();
    };
  }, [data, loading]);

  const keywordItems = useMemo(() => {
    return data.keywordCloud.map((item, idx) => {
      const tone = getKeywordTone(idx);
      return { ...item, tone };
    });
  }, [data.keywordCloud]);

  const filteredKeywordItems = useMemo(() => {
    if (keywordFilter === "all") return keywordItems;
    if (keywordFilter === "positive") {
      return keywordItems.filter((item) => item.tone === "positive");
    }
    if (keywordFilter === "negative") {
      return keywordItems.filter((item) => item.tone === "negative");
    }
    return keywordItems;
  }, [keywordFilter, keywordItems]);

  return (
    <section className="section active" id="section-reputation">
      <div className="section-header">
        <h1>
          <i className="fas fa-chart-column"></i> Reputation Monitor
        </h1>
        <p>신일팜글라스 미디어 · 재무 · 내부 평판 종합 분석</p>
      </div>

      {loading ? (
        <div className="chart-card" style={{ padding: "24px" }}>
          불러오는 중...
        </div>
      ) : (
        <>
          <div className="reputation-score-grid">
            <ScoreCard
              title="미디어 평판"
              score={data.scoreCards.mediaScore}
              accent="green"
              delta={getReputationDelta(data.scoreCards.mediaScore, "media")}
            />
            <ScoreCard
              title="재무 건전성"
              score={data.scoreCards.financeScore}
              accent="yellow"
              delta={getReputationDelta(
                data.scoreCards.financeScore,
                "finance"
              )}
            />
            <ScoreCard
              title="내부 평판"
              score={data.scoreCards.internalScore}
              accent="violet"
              delta={getReputationDelta(
                data.scoreCards.internalScore,
                "internal"
              )}
            />
            <ScoreCard
              title="종합 평판 지수"
              score={data.scoreCards.totalReputation}
              accent="purple"
              delta={getReputationDelta(
                data.scoreCards.totalReputation,
                "total"
              )}
            />
          </div>

          <div className="reputation-chart-row">
            <div className="chart-card reputation-chart-card">
              <div className="chart-header">
                <h3>
                  <i className="fas fa-chart-line"></i> 감성 트렌드 분석 (12개월)
                </h3>
              </div>
              <div className="reputation-chart-canvas-wrap">
                <canvas ref={trendCanvasRef}></canvas>
              </div>
            </div>

            <div className="chart-card reputation-chart-card">
              <div className="chart-header">
                <h3>
                  <i className="fas fa-chart-pie"></i> 미디어 카테고리
                </h3>
              </div>
              <div className="reputation-chart-canvas-wrap">
                <canvas ref={categoryCanvasRef}></canvas>
              </div>
            </div>
          </div>

          <div className="reputation-bottom-row">
            <div className="chart-card reputation-keyword-card">
              <div className="chart-header">
                <h3>
                  <i className="fas fa-cloud"></i> 키워드 워드클라우드
                </h3>
              </div>

              <div className="reputation-keyword-toolbar">
                <button
                  type="button"
                  className={`keyword-filter ${
                    keywordFilter === "positive" ? "active" : ""
                  }`}
                  onClick={() => setKeywordFilter("positive")}
                >
                  긍정
                </button>
                <button
                  type="button"
                  className={`keyword-filter ${
                    keywordFilter === "negative" ? "active" : ""
                  }`}
                  onClick={() => setKeywordFilter("negative")}
                >
                  부정
                </button>
                <button
                  type="button"
                  className={`keyword-filter ${
                    keywordFilter === "all" ? "active" : ""
                  }`}
                  onClick={() => setKeywordFilter("all")}
                >
                  전체
                </button>
              </div>

              <div className="reputation-keyword-wrap">
                {filteredKeywordItems.length === 0 ? (
                  <div className="reputation-empty-text">
                    표시할 키워드가 없습니다.
                  </div>
                ) : (
                  filteredKeywordItems.map((item) => (
                    <span
                      key={item.text}
                      className={`reputation-keyword-chip tone-${item.tone}`}
                      style={{ fontSize: `${item.weight}px` }}
                    >
                      {item.text}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="chart-card reputation-issues-card">
              <div className="chart-header">
                <h3>
                  <i className="fas fa-circle-info"></i> 주요 이슈 TOP 5
                </h3>
              </div>
              <div className="reputation-issue-list">
                {data.topIssues.map((issue, idx) => (
                  <div
                    key={`${issue.title}-${idx}`}
                    className={`reputation-issue-item ${
                      issue.tone === "negative" ? "negative" : "positive"
                    }`}
                  >
                    <div className="reputation-issue-left">
                      <div className="reputation-issue-rank">{idx + 1}</div>
                      <div className="reputation-issue-copy">
                        <div className="reputation-issue-title">
                          {issue.title}
                        </div>
                        <div className="reputation-issue-sub">
                          <span
                            className={`issue-badge ${
                              issue.tone === "negative"
                                ? "negative"
                                : "positive"
                            }`}
                          >
                            {issue.tone === "negative" ? "부정" : "긍정"}
                          </span>
                          <span>{issue.category}</span>
                          <span>언급 {issue.mentions}건</span>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`reputation-issue-score ${
                        issue.tone === "negative" ? "negative" : "positive"
                      }`}
                    >
                      {issue.tone === "negative" ? "-" : "+"}
                      {issue.score}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}