"use client";

import { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import MediaCategoryPanel from "./MediaCategory";
import {
  reputationSentimentTrend,
  reputationMediaTrend,
  reputationMediaCategory,
} from "../mockData/reputationData";

export default function TrendAndMediaRow() {
  const [activeTab, setActiveTab] = useState<"sentiment" | "media">(
    "sentiment"
  );

  const trendCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const categoryCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!trendCanvasRef.current || !categoryCanvasRef.current) return;

    const trendCanvas = trendCanvasRef.current;
    const categoryCanvas = categoryCanvasRef.current;

    let trendChart: Chart | null = null;
    let categoryChart: Chart | null = null;

    if (activeTab === "sentiment") {
      trendChart = new Chart(trendCanvas, {
        type: "line",
        data: {
          labels: reputationSentimentTrend.labels,
          datasets: [
            {
              label: "긍정",
              data: reputationSentimentTrend.positive,
              borderColor: "#22c55e",
              backgroundColor: "rgba(34,197,94,0.10)",
              fill: true,
              tension: 0.4,
              pointRadius: 3,
              pointBackgroundColor: "#22c55e",
              pointBorderWidth: 0,
              borderWidth: 2,
            },
            {
              label: "부정",
              data: reputationSentimentTrend.negative,
              borderColor: "#ef4444",
              backgroundColor: "rgba(239,68,68,0.08)",
              fill: true,
              tension: 0.4,
              pointRadius: 3,
              pointBackgroundColor: "#ef4444",
              pointBorderWidth: 0,
              borderWidth: 2,
            },
            {
              label: "중립",
              data: reputationSentimentTrend.neutral,
              borderColor: "#3b82f6",
              backgroundColor: "rgba(59,130,246,0.06)",
              fill: true,
              tension: 0.4,
              pointRadius: 3,
              pointBackgroundColor: "#3b82f6",
              pointBorderWidth: 0,
              borderWidth: 2,
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
              labels: {
                color: "#8892a4",
                padding: 12,
                boxWidth: 10,
                font: {
                  size: 11,
                  family: "'Noto Sans KR', sans-serif",
                },
              },
            },
            tooltip: {
              backgroundColor: "#111827",
              titleColor: "#ffffff",
              bodyColor: "#e5e7eb",
              borderColor: "rgba(255,255,255,0.08)",
              borderWidth: 1,
            },
          },
          scales: {
            x: {
              grid: {
                color: "rgba(255,255,255,0.06)",
              },
              ticks: {
                color: "#8892a4",
                font: {
                  size: 11,
                  family: "'Noto Sans KR', sans-serif",
                },
              },
            },
            y: {
              min: 0,
              max: 100,
              ticks: {
                color: "#8892a4",
                callback: (value) => `${value}%`,
                font: {
                  size: 11,
                  family: "'Noto Sans KR', sans-serif",
                },
              },
              grid: {
                color: "rgba(255,255,255,0.06)",
              },
            },
          },
        },
      });
    } else {
      trendChart = new Chart(trendCanvas, {
        type: "bar",
        data: {
          labels: reputationMediaTrend.labels,
          datasets: [
            {
              label: "기사 건수",
              data: reputationMediaTrend.count,
              backgroundColor: "rgba(99,102,241,0.50)",
              borderColor: "#6366f1",
              borderWidth: 1,
              borderRadius: 4,
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
            tooltip: {
              backgroundColor: "#111827",
              titleColor: "#ffffff",
              bodyColor: "#e5e7eb",
              borderColor: "rgba(255,255,255,0.08)",
              borderWidth: 1,
            },
          },
          scales: {
            x: {
              grid: {
                color: "rgba(255,255,255,0.06)",
              },
              ticks: {
                color: "#8892a4",
                font: {
                  size: 11,
                  family: "'Noto Sans KR', sans-serif",
                },
              },
            },
            y: {
              ticks: {
                color: "#8892a4",
                stepSize: 10,
                font: {
                  size: 11,
                  family: "'Noto Sans KR', sans-serif",
                },
              },
              grid: {
                color: "rgba(255,255,255,0.06)",
              },
            },
          },
        },
      });
    }

    categoryChart = new Chart(categoryCanvas, {
      type: "doughnut",
      data: {
        labels: reputationMediaCategory.labels,
        datasets: [
          {
            data: reputationMediaCategory.values,
            backgroundColor: [
              "rgba(99,102,241,0.70)",
              "rgba(34,197,94,0.70)",
              "rgba(59,130,246,0.70)",
              "rgba(245,158,11,0.70)",
              "rgba(168,85,247,0.70)",
              "rgba(239,68,68,0.70)",
            ],
            borderColor: [
              "#6366f1",
              "#22c55e",
              "#3b82f6",
              "#f59e0b",
              "#a855f7",
              "#ef4444",
            ],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        cutout: "60%",
        plugins: {
          legend: {
            position: "right",
            labels: {
              color: "#8892a4",
              padding: 12,
              boxWidth: 10,
              font: {
                size: 11,
                family: "'Noto Sans KR', sans-serif",
              },
            },
          },
          tooltip: {
            backgroundColor: "#111827",
            titleColor: "#ffffff",
            bodyColor: "#e5e7eb",
            borderColor: "rgba(255,255,255,0.08)",
            borderWidth: 1,
          },
        },
      },
    });

    return () => {
      trendChart?.destroy();
      categoryChart?.destroy();
    };
  }, [activeTab]);

  return (
    <div className="charts-row">
      <div className="chart-card flex-2">
        <div className="chart-header">
          <h3>
            <i className="fas fa-chart-line"></i> 감성 트렌드 분석 (12개월)
          </h3>

          <div className="chart-tabs">
            <button
              className={`tab-btn ${activeTab === "sentiment" ? "active" : ""}`}
              onClick={() => setActiveTab("sentiment")}
            >
              감성 분석
            </button>
            <button
              className={`tab-btn ${activeTab === "media" ? "active" : ""}`}
              onClick={() => setActiveTab("media")}
            >
              미디어 노출
            </button>
          </div>
        </div>

        <div style={{ height: "240px" }}>
          <canvas ref={trendCanvasRef}></canvas>
        </div>
      </div>

      <MediaCategoryPanel canvasRef={categoryCanvasRef} />
    </div>
  );
}