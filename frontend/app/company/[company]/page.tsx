"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

/* =========================
   타입 정의
========================= */

interface Event {
  event_type: string;
  impact_type: string;
  impact_strength: number;
  created_at: string;
}

interface RawStrategy {
  actions: unknown;
  updated_at: string;
}

interface Dashboard {
  risk_score: number;
  opportunity_score: number;
  risk_delta: number;
  opportunity_delta: number;
}

/* =========================
   메인 컴포넌트
========================= */

export default function CompanyDetail() {
  const params = useParams();
  const companyParam = params.company as string;
  const company = decodeURIComponent(companyParam);

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [strategy, setStrategy] = useState<RawStrategy | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(
          `/api/company/${encodeURIComponent(company)}`
        );

        if (!res.ok) throw new Error("API failed");

        const data: {
          dashboard: Dashboard | null;
          events: Event[];
          strategy: RawStrategy | null;
        } = await res.json();

        setDashboard(data.dashboard);
        setEvents(data.events ?? []);
        setStrategy(data.strategy);
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [company]);

  /* =========================
     전략 안전 파싱
  ========================= */

  const strategyList: string[] = useMemo(() => {
    if (!strategy || !strategy.actions) return [];

    const value = strategy.actions;

    if (Array.isArray(value)) {
      return value.filter((v): v is string => typeof v === "string");
    }

    if (
      typeof value === "object" &&
      value !== null &&
      "actions" in value
    ) {
      const obj = value as { actions?: unknown };
      if (Array.isArray(obj.actions)) {
        return obj.actions.filter(
          (v): v is string => typeof v === "string"
        );
      }
    }

    if (typeof value === "string") {
      try {
        const parsed: unknown = JSON.parse(value);

        if (Array.isArray(parsed)) {
          return parsed.filter(
            (v): v is string => typeof v === "string"
          );
        }

        if (
          typeof parsed === "object" &&
          parsed !== null &&
          "actions" in parsed
        ) {
          const obj = parsed as { actions?: unknown };
          if (Array.isArray(obj.actions)) {
            return obj.actions.filter(
              (v): v is string => typeof v === "string"
            );
          }
        }
      } catch (error) {
        console.error("Strategy parse error:", error);
      }
    }

    return [];
  }, [strategy]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        데이터 불러오는 중...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-10">
      {/* 헤더 */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">
          🏢 {company}
        </h1>
        <p className="text-gray-500 mt-2">
          기업 리스크 및 전략 분석 리포트
        </p>
      </div>

      {/* 점수 카드 */}
      <div className="grid grid-cols-4 gap-6 mb-14">
        <ScoreCard
          label="Risk Score"
          value={dashboard?.risk_score}
          delta={dashboard?.risk_delta}
          color="red"
        />
        <ScoreCard
          label="Opportunity Score"
          value={dashboard?.opportunity_score}
          delta={dashboard?.opportunity_delta}
          color="blue"
        />
        <ScoreCard
          label="Risk Δ"
          value={dashboard?.risk_delta}
          color="orange"
        />
        <ScoreCard
          label="Opp Δ"
          value={dashboard?.opportunity_delta}
          color="green"
        />
      </div>

      {/* 이벤트 */}
      <Section title="📡 최근 이벤트">
        {events.length === 0 && (
          <EmptyState message="최근 이벤트가 없습니다." />
        )}

        {events.map((event: Event, index: number) => (
          <div
            key={index}
            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-4"
          >
            <div className="font-semibold text-lg">
              {event.event_type}
            </div>

            <div className="text-sm text-gray-500 mt-2">
              {event.impact_type} · Strength{" "}
              <span className="font-medium">
                {event.impact_strength}
              </span>
            </div>

            <div className="text-xs text-gray-400 mt-2">
              {new Date(event.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </Section>

      {/* 전략 */}
      <Section title="🧠 실행 전략">
        {strategyList.length === 0 && (
          <EmptyState message="생성된 전략이 없습니다." />
        )}

        {strategyList.map((action: string, index: number) => (
          <div
            key={index}
            className="bg-blue-50 border border-blue-200 p-5 rounded-2xl mb-4 text-blue-900 leading-relaxed"
          >
            {action}
          </div>
        ))}

        {strategy && (
          <div className="text-xs text-gray-500 mt-4">
            전략 생성일:{" "}
            {new Date(strategy.updated_at).toLocaleString()}
          </div>
        )}
      </Section>
    </main>
  );
}

/* =========================
   UI 컴포넌트
========================= */

function ScoreCard({
  label,
  value,
  delta,
  color
}: {
  label: string;
  value?: number;
  delta?: number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    red: "text-red-600",
    blue: "text-blue-600",
    green: "text-green-600",
    orange: "text-orange-600"
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 text-center border border-gray-100">
      <div className="text-sm text-gray-500">{label}</div>

      <div
        className={`text-3xl font-bold mt-3 ${
          colorMap[color] ?? "text-gray-800"
        }`}
      >
        {value !== undefined ? Math.round(value) : "-"}
      </div>

      {delta !== undefined && (
        <div className="text-xs text-gray-400 mt-2">
          Δ {delta.toFixed(2)}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-14">
      <h2 className="text-xl font-semibold mb-6 tracking-tight">
        {title}
      </h2>
      {children}
    </div>
  );
}

function EmptyState({
  message
}: {
  message: string;
}) {
  return (
    <div className="bg-white p-6 rounded-2xl text-gray-400 text-center border border-gray-100">
      {message}
    </div>
  );
}