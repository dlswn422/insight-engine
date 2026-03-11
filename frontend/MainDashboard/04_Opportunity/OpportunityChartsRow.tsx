"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import {
  opportunitySourceData,
  opportunityRevenueData,
} from "../mockData/opportunityData";

export default function OpportunityChartsRow() {
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const revenueCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!sourceCanvasRef.current || !revenueCanvasRef.current) return;

    const sourceChart = new Chart(sourceCanvasRef.current, {
      type: "pie",
      data: {
        labels: opportunitySourceData.labels,
        datasets: [
          {
            data: opportunitySourceData.values,
            backgroundColor: [
              "rgba(99,102,241,0.7)",
              "rgba(34,197,94,0.7)",
              "rgba(59,130,246,0.7)",
              "rgba(245,158,11,0.7)",
              "rgba(168,85,247,0.7)",
              "rgba(239,68,68,0.7)",
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            position: "right",
            labels: {
              color: "#8892a4",
              padding: 10,
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

    const revenueChart = new Chart(revenueCanvasRef.current, {
      type: "bar",
      data: {
        labels: opportunityRevenueData.labels,
        datasets: [
          {
            label: "예상 연간 매출 (억원)",
            data: opportunityRevenueData.values,
            backgroundColor: [
              "rgba(99,102,241,0.7)",
              "rgba(34,197,94,0.7)",
              "rgba(245,158,11,0.7)",
              "rgba(239,68,68,0.7)",
              "rgba(59,130,246,0.7)",
            ],
            borderColor: ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6"],
            borderWidth: 1,
            borderRadius: 6,
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
            grid: {
              color: "rgba(255,255,255,0.06)",
            },
            ticks: {
              color: "#8892a4",
              callback: (value) => `${value}억`,
              font: {
                size: 11,
                family: "'Noto Sans KR', sans-serif",
              },
            },
          },
        },
      },
    });

    return () => {
      sourceChart.destroy();
      revenueChart.destroy();
    };
  }, []);

  return (
    <div className="charts-row" style={{ marginTop: "24px" }}>
      <div className="chart-card flex-1">
        <div className="chart-header">
          <h3>
            <i className="fas fa-database"></i> 기회 발굴 소스
          </h3>
        </div>
        <div style={{ height: "240px" }}>
          <canvas ref={sourceCanvasRef}></canvas>
        </div>
      </div>

      <div className="chart-card flex-2">
        <div className="chart-header">
          <h3>
            <i className="fas fa-chart-bar"></i> 기회 유형별 예상 매출
          </h3>
        </div>
        <div style={{ height: "240px" }}>
          <canvas ref={revenueCanvasRef}></canvas>
        </div>
      </div>
    </div>
  );
}