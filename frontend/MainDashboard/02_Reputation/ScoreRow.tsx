"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { reputationScoreCards } from "../mockData/reputationData";

type ScoreKey = "media" | "finance" | "internal" | "total";

const gaugeColorMap: Record<ScoreKey, string> = {
  media: "#22c55e",
  finance: "#f59e0b",
  internal: "#6366f1",
  total: "#818cf8",
};

const trendIconMap = {
  positive: "fas fa-arrow-up",
  negative: "fas fa-arrow-down",
  warning: "fas fa-minus",
};

export default function ScoreRow() {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    const charts: Chart[] = [];

    reputationScoreCards.forEach((card, index) => {
      const canvas = canvasRefs.current[index];
      if (!canvas) return;

      const chart = new Chart(canvas, {
        type: "doughnut",
        data: {
          datasets: [
            {
              data: [card.value, 100 - card.value],
              backgroundColor: [
                gaugeColorMap[card.key],
                "rgba(255,255,255,0.06)",
              ],
              borderWidth: 0,
              hoverOffset: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          cutout: "72%",
          rotation: -90,
          circumference: 180,
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              enabled: false,
            },
          },
        },
      });

      charts.push(chart);
    });

    return () => {
      charts.forEach((chart) => chart.destroy());
    };
  }, []);

  return (
    <div className="rep-score-row">
      {reputationScoreCards.map((card, index) => (
        <div
          key={card.key}
          className={`rep-score-card ${card.highlight ? "highlight" : ""}`}
        >
          <div className="rep-score-label">{card.label}</div>

          <div className="rep-score-gauge">
            <canvas
              ref={(el) => {
                canvasRefs.current[index] = el;
              }}
            />
          </div>

          <div
            className={`rep-score-value ${card.key === "total" ? "large" : ""}`}
          >
            {card.value}
            <span>/100</span>
          </div>

          <div className={`rep-score-trend ${card.trendType}`}>
            <i className={trendIconMap[card.trendType]}></i> {card.trendText}
          </div>
        </div>
      ))}
    </div>
  );
}