"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Chart from "chart.js/auto";

type DashboardData = {
  company_name: string;
  risk_score: number;
  opportunity_score: number;
  risk_level: string;
  opportunity_level: string;
  risk_delta: number;
  opportunity_delta: number;
  momentum_score: number;
  updated_at: string;
};

type EventItem = {
  article_id?: string;
  company_name?: string;
  event_type: string;
  impact_type: string;
  impact_strength: number;
  severity_level?: number;
  confidence?: number;
  signal_category?: string;
  industry_tag?: string;
  trend_bucket?: string;
  created_at?: string;
};

type StrategyAction = {
  title?: string;
  owner?: string;
  timeline?: string;
  expected_impact?: string;
  evidence?: string[];
};

type StrategyData = {
  company_name?: string;
  actions?: any;
  updated_at?: string;
  strategy_type?: string;
  trigger_type?: string;
  confidence_score?: number;
  momentum_score?: number;
  risk_7d?: number;
  risk_30d?: number;
  opp_7d?: number;
  opp_30d?: number;
};

type CompanyDetailResponse = {
  dashboard: DashboardData | null;
  events: EventItem[];
  strategy: StrategyData | null;
};

type Props = {
  companyName: string;
  onClose: () => void;
};

function normalizeStrategyActions(strategy: StrategyData | null): StrategyAction[] {
  if (!strategy) return [];
  const raw = strategy.actions;
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.actions)) return raw.actions;
  return [];
}

function buildTrendSeries(riskScore: number) {
  const current = Math.max(120, 340 - Math.round(riskScore));
  const p1 = current + 70;
  const p2 = current + 62;
  const p3 = current + 54;
  const p4 = current + 36;
  const p5 = current + 14;
  return [p1, p2, p3, p4, p5, current];
}

function buildSignalLevel(signal: EventItem) {
  const severity = Number(signal.severity_level ?? 1);
  return severity >= 4 ? "위험" : "주의";
}

function statusLabel(riskScore: number) {
  if (riskScore >= 70) return "이탈 위험";
  if (riskScore >= 40) return "주의 관찰";
  return "안정";
}

export default function CustomerHealthModal({ companyName, onClose }: Props) {
  const [data, setData] = useState<CompanyDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const trendCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/company/${encodeURIComponent(companyName)}`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error("Failed to fetch company modal detail:", e);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [companyName]);

  const strategyActions = useMemo(
    () => normalizeStrategyActions(data?.strategy ?? null),
    [data]
  );

  useEffect(() => {
    if (!trendCanvasRef.current || !data?.dashboard) return;

    const trendValues = buildTrendSeries(Number(data.dashboard.risk_score ?? 0));

    const chart = new Chart(trendCanvasRef.current, {
      type: "line",
      data: {
        labels: ["12월", "1월", "2월", "3월", "4월", "5월"],
        datasets: [
          {
            data: trendValues,
            borderColor: "rgba(255,93,115,1)",
            backgroundColor: "rgba(255,93,115,0.12)",
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointBackgroundColor: "rgba(255,93,115,1)",
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
            grid: { color: "rgba(255,255,255,0.06)" },
            ticks: { color: "#94a3b8" },
          },
        },
      },
    });

    return () => chart.destroy();
  }, [data]);

if (!mounted || !companyName) return null;

return createPortal(
  <div className="health-modal-overlay" onClick={onClose}>
    <div className="health-modal" onClick={(e) => e.stopPropagation()}>
      {loading ? (
        <div className="health-modal-loading">불러오는 중...</div>
      ) : !data?.dashboard ? (
        <div className="health-modal-loading">상세 데이터를 불러오지 못했습니다.</div>
      ) : (
        <>
          <button className="health-modal-close" onClick={onClose}>
            ×
          </button>

          <div className="health-modal-header">
            <div className="health-modal-company-wrap">
              <span className="health-modal-dot"></span>
              <div>
                <div className="health-modal-company">{data.dashboard.company_name}</div>
                <div className="health-modal-sub">
                  분석 기준 시각 · {data.dashboard.updated_at}
                </div>
              </div>
            </div>

            <div className="health-modal-status">
              {statusLabel(Number(data.dashboard.risk_score ?? 0))}
            </div>
          </div>

          <div className="health-modal-kpis">
            <div className="health-modal-kpi">
              <div className="health-modal-kpi-label">건강도 점수</div>
              <div className="health-modal-kpi-value">
                {Math.max(
                  0,
                  Math.min(
                    100,
                    Math.round(
                      100 -
                        Number(data.dashboard.risk_score ?? 0) * 0.7 +
                        Number(data.dashboard.opportunity_score ?? 0) * 0.15
                    )
                  )
                )}
                <span>/100</span>
              </div>
            </div>

            <div className="health-modal-kpi">
              <div className="health-modal-kpi-label">이탈 위험도</div>
              <div className="health-modal-kpi-value danger">
                {Math.round(Number(data.dashboard.risk_score ?? 0))}%
              </div>
            </div>

            <div className="health-modal-kpi">
              <div className="health-modal-kpi-label">발주 추이</div>
              <div className="health-modal-kpi-value danger">
                {Number(data.dashboard.risk_delta ?? 0) > 0
                  ? `-${Math.min(23, Math.round(data.dashboard.risk_delta / 4))}%`
                  : "+0%"}
              </div>
            </div>
          </div>

          <div className="health-modal-chart-card">
            <div className="health-modal-section-title">발주량 추이 (6개월)</div>
            <div className="health-modal-trend-wrap">
              <canvas ref={trendCanvasRef}></canvas>
            </div>
          </div>

          <div className="health-modal-signals">
            <div className="health-modal-section-title">
              감지된 이탈 신호 ({Math.min(data.events?.length ?? 0, 5)}건)
            </div>

            <div className="health-signal-list">
              {(data.events ?? []).slice(0, 5).map((signal, idx) => (
                <div key={`${signal.article_id ?? idx}`} className="health-signal-item">
                  <div className="health-signal-main">
                    <div className="health-signal-title">{signal.event_type}</div>
                    <div className="health-signal-desc">
                      {signal.signal_category || "분석 신호"} · 강도 {signal.impact_strength}
                    </div>
                  </div>
                  <div
                    className={`health-signal-level ${
                      buildSignalLevel(signal) === "위험" ? "danger" : "warning"
                    }`}
                  >
                    {buildSignalLevel(signal)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="health-modal-strategy-card">
            <div className="health-modal-section-title">AI 권장 대응 전략</div>
            <ul className="health-strategy-list">
              {strategyActions.length > 0 ? (
                strategyActions.slice(0, 4).map((action, idx) => (
                  <li key={idx}>
                    {action.title || "전략"}
                    {action.timeline ? ` (${action.timeline})` : ""}
                  </li>
                ))
              ) : (
                <>
                  <li>즉시 주요 관계자 접촉 및 상황 점검</li>
                  <li>가격/품질/납기 조건 재검토</li>
                  <li>최근 부정 신호에 대한 대응 자료 제공</li>
                  <li>담당 영업 1:1 관계 재구축 집중</li>
                </>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  </div>,
  document.body
);
}