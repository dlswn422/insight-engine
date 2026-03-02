"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Event {
  event_type: string;
  impact_type: string;
  impact_strength: number;
  created_at: string;
}

interface Strategy {
  actions: string;
  generated_at: string;
}

interface Dashboard {
  risk_score: number;
  opportunity_score: number;
  risk_delta: number;
  opportunity_delta: number;
}

export default function CompanyDetail() {
  const params = useParams();
  const company = decodeURIComponent(params.company as string);

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/company/${encodeURIComponent(company)}`)
      .then((res) => res.json())
      .then((data) => {
        setDashboard(data.dashboard);
        setEvents(data.events || []);
        setStrategy(data.strategy);
        setLoading(false);
      });
  }, [company]);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-8">
        🏢 {company} 분석 리포트
      </h1>

      {/* 점수 요약 */}
      <div className="grid grid-cols-4 gap-6 mb-12">
        <ScoreCard label="Risk Score" value={dashboard?.risk_score} color="red" />
        <ScoreCard label="Opp Score" value={dashboard?.opportunity_score} color="blue" />
        <ScoreCard label="Risk Δ" value={dashboard?.risk_delta} color="orange" />
        <ScoreCard label="Opp Δ" value={dashboard?.opportunity_delta} color="green" />
      </div>

      {/* 이벤트 타임라인 */}
      <Section title="📡 최근 이벤트">
        {events.length === 0 && (
          <div className="text-gray-500">최근 이벤트가 없습니다.</div>
        )}

        {events.map((event, i) => (
          <div key={i} className="bg-white p-4 rounded-xl shadow mb-3">
            <div className="font-semibold">{event.event_type}</div>
            <div className="text-sm text-gray-500 mt-1">
              {event.impact_type} / Strength {event.impact_strength}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {new Date(event.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </Section>

      {/* 실행 전략 */}
      <Section title="🧠 실행 전략">
        {!strategy && (
          <div className="text-gray-500">
            생성된 전략이 없습니다.
          </div>
        )}

        {strategy && (
          <>
            {JSON.parse(strategy.actions || "[]").map(
              (action: string, i: number) => (
                <div
                  key={i}
                  className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-3"
                >
                  {action}
                </div>
              )
            )}

            <div className="text-xs text-gray-500 mt-3">
              전략 생성일: {new Date(strategy.generated_at).toLocaleString()}
            </div>
          </>
        )}
      </Section>
    </main>
  );
}

function ScoreCard({
  label,
  value,
  color
}: {
  label: string;
  value?: number;
  color: string;
}) {
  const colorMap: any = {
    red: "text-red-600",
    blue: "text-blue-600",
    green: "text-green-600",
    orange: "text-orange-600"
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6 text-center">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-3xl font-bold mt-2 ${colorMap[color]}`}>
        {Math.round(value || 0)}
      </div>
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
    <div className="mb-12">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}