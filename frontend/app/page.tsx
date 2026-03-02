"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Company {
  company_name: string;
  risk_score: number;
  opportunity_score: number;
  risk_delta: number;
  opportunity_delta: number;
  risk_level: string;
  opportunity_level: string;
}

export default function Home() {
  const [data, setData] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((res) => {
        // 🔥 HIGH 우선 정렬 + risk_score 기준
        const sorted = res.sort(
          (a: Company, b: Company) => b.risk_score - a.risk_score
        );
        setData(sorted);
        setLoading(false);
      });
  }, []);

  const highRisk = data.filter((d) => d.risk_level === "HIGH").length;
  const highOpportunity = data.filter(
    (d) => d.opportunity_level === "HIGH"
  ).length;
  const spike = data.filter((d) => d.risk_delta > 30).length;

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-8">
        📊 Market & Opportunity Radar
      </h1>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-6 mb-10">
        <KpiCard title="🔴 고위험 기업" value={highRisk} color="text-red-600" />
        <KpiCard
          title="🔵 고기회 기업"
          value={highOpportunity}
          color="text-blue-600"
        />
        <KpiCard title="⚡ 급등 기업" value={spike} color="text-orange-500" />
      </div>

      {/* 기업 리스트 */}
      <div className="bg-white rounded-3xl shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-6">기업 리스크/기회 현황</h2>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="space-y-4">
            {data.map((company) => (
              <CompanyCard
                key={company.company_name}
                company={company}
                onClick={() =>
                  router.push(`/company/${company.company_name}`)
                }
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function KpiCard({
  title,
  value,
  color
}: {
  title: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-3xl shadow p-6 text-center">
      <div className="text-sm text-gray-500">{title}</div>
      <div className={`text-4xl font-bold mt-2 ${color}`}>{value}</div>
    </div>
  );
}

function CompanyCard({
  company,
  onClick
}: {
  company: Company;
  onClick: () => void;
}) {
  const riskColor =
    company.risk_level === "HIGH"
      ? "bg-red-500"
      : company.risk_level === "MEDIUM"
      ? "bg-yellow-500"
      : "bg-green-500";

  const oppColor =
    company.opportunity_level === "HIGH"
      ? "bg-blue-600"
      : company.opportunity_level === "MEDIUM"
      ? "bg-yellow-400"
      : "bg-green-400";

  return (
    <div
      onClick={onClick}
      className="cursor-pointer border rounded-2xl p-5 hover:shadow-lg transition flex justify-between items-center bg-gray-50"
    >
      {/* 좌측 */}
      <div>
        <div className="text-xl font-semibold">
          {company.company_name}
        </div>

        <div className="mt-2 flex gap-4 text-sm text-gray-500">
          <span>
            Risk Δ:{" "}
            <span
              className={
                company.risk_delta > 30
                  ? "text-red-600 font-semibold"
                  : ""
              }
            >
              {company.risk_delta > 0
                ? `+${company.risk_delta}`
                : company.risk_delta}
            </span>
          </span>

          <span>
            Opp Δ:{" "}
            {company.opportunity_delta > 0
              ? `+${company.opportunity_delta}`
              : company.opportunity_delta}
          </span>
        </div>

        {/* 점수 바 시각화 */}
        <div className="mt-4 w-64 bg-gray-200 rounded-full h-2">
          <div
            className="bg-red-500 h-2 rounded-full"
            style={{ width: `${company.risk_score}%` }}
          />
        </div>
      </div>

      {/* 우측 점수 배지 */}
      <div className="flex gap-4 items-center">
        <ScoreBadge
          label="Risk"
          score={company.risk_score}
          color={riskColor}
        />
        <ScoreBadge
          label="Opp"
          score={company.opportunity_score}
          color={oppColor}
        />
      </div>
    </div>
  );
}

function ScoreBadge({
  label,
  score,
  color
}: {
  label: string;
  score: number;
  color: string;
}) {
  return (
    <div
      className={`text-white px-5 py-2 rounded-full font-semibold ${color}`}
    >
      {label} {Math.round(score)}
    </div>
  );
}