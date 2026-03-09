"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import {
  overviewHealthTrend,
  overviewHealthDistribution,
} from "../mockData/overviewData";

export default function OverviewChartsRow() {
  const trendCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const distCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!trendCanvasRef.current || !distCanvasRef.current) return;

    const trendChart = new Chart(trendCanvasRef.current, {
      type: "line",
      data: {
        labels: overviewHealthTrend.labels,
        datasets: [
          {
            label: "건강",
            data: overviewHealthTrend.green,
            borderColor: "#22c55e",
            backgroundColor: "rgba(34,197,94,0.10)",
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: "#22c55e",
            pointBorderWidth: 0,
            borderWidth: 2,
          },
          {
            label: "주의",
            data: overviewHealthTrend.yellow,
            borderColor: "#f59e0b",
            backgroundColor: "rgba(245,158,11,0.08)",
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: "#f59e0b",
            pointBorderWidth: 0,
            borderWidth: 2,
          },
          {
            label: "위험",
            data: overviewHealthTrend.red,
            borderColor: "#ef4444",
            backgroundColor: "rgba(239,68,68,0.08)",
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: "#ef4444",
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
            min: 0,
            max: 50,
            ticks: {
              stepSize: 10,
              color: "#8892a4",
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

    const distChart = new Chart(distCanvasRef.current, {
      type: "doughnut",
      data: {
        labels: overviewHealthDistribution.labels.map(
          (label, idx) => `${label} (${overviewHealthDistribution.values[idx]})`
        ),
        datasets: [
          {
            data: overviewHealthDistribution.values,
            backgroundColor: [
              "rgba(34,197,94,0.70)",
              "rgba(245,158,11,0.70)",
              "rgba(239,68,68,0.70)",
            ],
            borderColor: ["#22c55e", "#f59e0b", "#ef4444"],
            borderWidth: 2,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        cutout: "65%",
        plugins: {
          legend: {
            display: false,
            labels: {
              color: "#8892a4",
              padding: 14,
              boxWidth: 12,
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
      trendChart.destroy();
      distChart.destroy();
    };
  }, []);

  return (
    <div className="charts-row">
      <div className="chart-card flex-2">
        <div className="chart-header">
          <h3>
            <i className="fas fa-chart-line"></i> 고객 건강도 추이 (6개월)
          </h3>
          <div className="chart-legend">
            <span className="legend-dot green"></span>건강
            <span className="legend-dot yellow"></span>주의
            <span className="legend-dot red"></span>위험
          </div>
        </div>

        <div style={{ height: "220px" }}>
          <canvas ref={trendCanvasRef}></canvas>
        </div>
      </div>

      <div className="chart-card flex-1">
        <div className="chart-header">
          <h3>
            <i className="fas fa-chart-pie"></i> 고객 건강도 분포
          </h3>
        </div>

        <div style={{ height: "220px" }}>
          <canvas ref={distCanvasRef}></canvas>
        </div>
      </div>
    </div>
  );
}