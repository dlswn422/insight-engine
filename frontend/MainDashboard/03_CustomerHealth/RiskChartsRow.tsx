"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { CustomerItem, customerRadarChartData, customerOrderChangeData } from "../mockData/customerData";

interface RiskChartsRowProps {
  customers: CustomerItem[];
}

export default function RiskChartsRow({ customers }: RiskChartsRowProps) {
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const orderChangeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!radarCanvasRef.current || !orderChangeCanvasRef.current) return;

    const radarChart = new Chart(radarCanvasRef.current, {
      type: "radar",
      data: {
        labels: customerRadarChartData.labels,
        datasets: customerRadarChartData.datasets.map((dataset) => ({
          label: dataset.label,
          data: dataset.data,
          borderColor: dataset.borderColor,
          backgroundColor: dataset.backgroundColor,
          pointBackgroundColor: dataset.pointBackgroundColor,
          borderWidth: 2,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            position: "bottom",
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
          r: {
            min: 0,
            max: 100,
            grid: {
              color: "rgba(255,255,255,0.08)",
            },
            angleLines: {
              color: "rgba(255,255,255,0.08)",
            },
            pointLabels: {
              color: "#8892a4",
              font: {
                size: 11,
                family: "'Noto Sans KR', sans-serif",
              },
            },
            ticks: {
              display: false,
            },
          },
        },
      },
    });

    const colors = customerOrderChangeData.changes.map((value) =>
      value >= 0 ? "rgba(34,197,94,0.65)" : "rgba(239,68,68,0.65)"
    );

    const borders = customerOrderChangeData.changes.map((value) =>
      value >= 0 ? "#22c55e" : "#ef4444"
    );

    const orderChangeChart = new Chart(orderChangeCanvasRef.current, {
      type: "bar",
      data: {
        labels: customerOrderChangeData.companies,
        datasets: [
          {
            label: "발주량 변동 (%)",
            data: customerOrderChangeData.changes,
            backgroundColor: colors,
            borderColor: borders,
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        indexAxis: "y",
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
              callback: (value) => `${value}%`,
              font: {
                size: 11,
                family: "'Noto Sans KR', sans-serif",
              },
            },
          },
          y: {
            grid: {
              color: "transparent",
            },
            ticks: {
              color: "#8892a4",
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
      radarChart.destroy();
      orderChangeChart.destroy();
    };
  }, [customers]);

  return (
    <div className="charts-row" style={{ marginTop: "20px" }}>
      <div className="chart-card flex-1">
        <div className="chart-header">
          <h3>
            <i className="fas fa-spider"></i> 이탈 위험 고객 요인 분석
          </h3>
        </div>
        <div style={{ height: "280px" }}>
          <canvas ref={radarCanvasRef}></canvas>
        </div>
      </div>

      <div className="chart-card flex-1">
        <div className="chart-header">
          <h3>
            <i className="fas fa-chart-bar"></i> 발주량 변동 TOP 5 (전월 대비)
          </h3>
        </div>
        <div style={{ height: "280px" }}>
          <canvas ref={orderChangeCanvasRef}></canvas>
        </div>
      </div>
    </div>
  );
}