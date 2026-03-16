"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

type Props = {
  sourceData: {
    labels: string[];
    values: number[];
  };
  revenueData: {
    labels: string[];
    values: number[];
  };
};

export default function OpportunityChartsRow({
  sourceData,
  revenueData,
}: Props) {
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const revenueCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!sourceCanvasRef.current || !revenueCanvasRef.current) return;

    const sourceChart = new Chart(sourceCanvasRef.current, {
      type: "pie",
      data: {
        labels: sourceData.labels,
        datasets: [
          {
            data: sourceData.values,
            backgroundColor: [
              "rgba(34, 211, 238, 0.75)",
              "rgba(59, 130, 246, 0.75)",
              "rgba(16, 185, 129, 0.75)",
              "rgba(245, 158, 11, 0.75)",
              "rgba(244, 63, 94, 0.75)",
              "rgba(139, 92, 246, 0.75)",
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        layout: {
          padding: 8,
        },
        plugins: {
          legend: {
            position: "right",
            labels: {
              color: "#94a3b8",
              padding: 14,
              boxWidth: 10,
              font: {
                size: 11,
                family: "'Noto Sans KR', sans-serif",
              },
            },
          },
        },
      },
    });

    const revenueChart = new Chart(revenueCanvasRef.current, {
      type: "bar",
      data: {
        labels: revenueData.labels,
        datasets: [
          {
            data: revenueData.values,
            backgroundColor: [
              "rgba(14, 165, 233, 0.75)",
              "rgba(16, 185, 129, 0.75)",
              "rgba(245, 158, 11, 0.75)",
              "rgba(239, 68, 68, 0.75)",
              "rgba(99, 102, 241, 0.75)",
            ],
            borderWidth: 0,
            borderRadius: 8,
            maxBarThickness: 56,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            grid: { color: "rgba(255,255,255,0.06)" },
            ticks: { color: "#94a3b8" },
          },
          y: {
            beginAtZero: true,
            grid: { color: "rgba(255,255,255,0.06)" },
            ticks: {
              color: "#94a3b8",
              callback: (value) => `${value}억`,
            },
          },
        },
      },
    });

    return () => {
      sourceChart.destroy();
      revenueChart.destroy();
    };
  }, [sourceData, revenueData]);

  return (
    <div className="opportunity-charts-row">
      <div className="chart-card opportunity-chart-card">
        <div className="chart-header">
          <h3>
            <i className="fas fa-database"></i> 기회 발굴 소스
          </h3>
        </div>
        <div className="opportunity-chart-canvas-wrap">
          <canvas ref={sourceCanvasRef}></canvas>
        </div>
      </div>

      <div className="chart-card opportunity-chart-card">
        <div className="chart-header">
          <h3>
            <i className="fas fa-chart-bar"></i> 유형별 예상 매출
          </h3>
        </div>
        <div className="opportunity-chart-canvas-wrap">
          <canvas ref={revenueCanvasRef}></canvas>
        </div>
      </div>
    </div>
  );
}