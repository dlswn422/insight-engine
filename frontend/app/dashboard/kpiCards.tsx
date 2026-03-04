"use client";

import Tooltip from "./tooltip";

export default function KpiCards({
  highRisk,
  highOpportunity,
  spike
}: {
  highRisk: number;
  highOpportunity: number;
  spike: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-6 mb-10">
      <KpiCard
        title="🔴 고위험 기업"
        value={highRisk}
        color="text-red-600"
        tooltipText="현재 Risk Level이 HIGH로 분류된 기업 수입니다."
      />

      <KpiCard
        title="🔵 고기회 기업"
        value={highOpportunity}
        color="text-blue-600"
        tooltipText="현재 Opportunity Level이 HIGH로 분류된 기업 수입니다."
      />

      <KpiCard
        title="⚡ 급등 기업"
        value={spike}
        color="text-orange-500"
        tooltipText="Risk Δ가 기준치 이상 급증한 기업 수입니다."
      />
    </div>
  );
}

function KpiCard({
  title,
  value,
  color,
  tooltipText
}: {
  title: string;
  value: number;
  color: string;
  tooltipText: string;
}) {
  return (
    <div className="bg-white rounded-3xl shadow p-6 text-center">
      <div className="text-sm text-gray-500 inline-flex items-center justify-center gap-2">
        <span>{title}</span>

        <Tooltip content={tooltipText}>
          <button
            type="button"
            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-[10px] text-gray-600 hover:bg-gray-100"
          >
            ?
          </button>
        </Tooltip>
      </div>

      <div className={`text-4xl font-bold mt-2 ${color}`}>{value}</div>
    </div>
  );
}