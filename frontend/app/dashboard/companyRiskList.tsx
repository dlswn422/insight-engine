"use client";

import { useEffect, useMemo, useState } from "react";
import type { Company } from "./page";
import Pagination from "./pagination";

export default function CompanyRiskList({
  data,
  loading,
  onCompanyClick
}: {
  data: Company[];
  loading: boolean;
  onCompanyClick: (companyName: string) => void;
}) {
  const pageSize = 6; // 여기 원하는 개수로 조절
  const [page, setPage] = useState(1);

  // 데이터가 새로 들어오면 1페이지로 리셋 (필수)
  useEffect(() => {
    setPage(1);
  }, [data.length]);

  const safeData = data ?? [];

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return safeData.slice(start, start + pageSize);
  }, [safeData, page, pageSize]);

  if (loading) return <p>Loading...</p>;

  return (
    <div className="bg-white rounded-3xl shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-6">기업 리스크/기회 현황</h2>

      <div className="space-y-4">
        {paged.map((company) => (
          <CompanyCard
            key={company.company_name}
            company={company}
            onClick={() => onCompanyClick(company.company_name)}
          />
        ))}
      </div>

      <Pagination
        total={safeData.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
      />
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
        <div className="text-xl font-semibold">{company.company_name}</div>

        <div className="mt-2 flex gap-4 text-sm text-gray-500">
          <span>
            Risk Δ:{" "}
            <span
              className={company.risk_delta > 30 ? "text-red-600 font-semibold" : ""}
            >
              {company.risk_delta > 0 ? `+${company.risk_delta}` : company.risk_delta}
            </span>
          </span>

          <span>
            Opp Δ:{" "}
            {company.opportunity_delta > 0
              ? `+${company.opportunity_delta}`
              : company.opportunity_delta}
          </span>
        </div>

        {/* 점수 바 */}
        <div className="mt-4 w-64 bg-gray-200 rounded-full h-2">
          <div
            className="bg-red-500 h-2 rounded-full"
            style={{ width: `${company.risk_score}%` }}
          />
        </div>
      </div>

      {/* 우측 */}
      <div className="flex gap-4 items-center">
        <ScoreBadge label="Risk" score={company.risk_score} color={riskColor} />
        <ScoreBadge label="Opp" score={company.opportunity_score} color={oppColor} />
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
    <div className={`text-white px-5 py-2 rounded-full font-semibold ${color}`}>
      {label} {Math.round(score)}
    </div>
  );
}