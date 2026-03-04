"use client";

import { useMemo } from "react";
import type { Company } from "./page";
import Tooltip from "./tooltip";

type Item = {
  company_name: string;
  value: number; // delta
};

export default function DeltaTopCard({
  data,
  onCompanyClick,
  daysLabel = "지난 7일 기준",
  topN = 3
}: {
  data: Company[];
  onCompanyClick: (companyName: string) => void;
  daysLabel?: string;
  topN?: number;
}) {
  const { riskTop, oppTop, riskMax, oppMax } = useMemo(() => {
    const safe = data ?? [];

    const risk: Item[] = safe
      .map((c) => ({ company_name: c.company_name, value: Number(c.risk_delta ?? 0) }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, topN);

    const opp: Item[] = safe
      .map((c) => ({
        company_name: c.company_name,
        value: Number(c.opportunity_delta ?? 0)
      }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, topN);

    const rMax = Math.max(1, ...risk.map((x) => x.value));
    const oMax = Math.max(1, ...opp.map((x) => x.value));

    return { riskTop: risk, oppTop: opp, riskMax: rMax, oppMax: oMax };
  }, [data, topN]);

  return (
    <div className="bg-white rounded-3xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="text-xl font-semibold">급등 기업 Δ Top</div>
      
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{daysLabel}</span>
         
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-2 gap-10">
        {/* Risk */}
        <div>
          <div className="text-lg font-semibold text-red-600 mb-4">Risk Δ</div>

          <div className="space-y-6">
            {riskTop.length === 0 ? (
              <EmptyRow label="표시할 급등 Risk Δ가 없습니다." />
            ) : (
              riskTop.map((item) => (
                <DeltaRow
                  key={`risk-${item.company_name}`}
                  name={item.company_name}
                  value={item.value}
                  max={riskMax}
                  tone="risk"
                  onClick={() => onCompanyClick(item.company_name)}
                />
              ))
            )}
          </div>
        </div>

        {/* Opportunity */}
        <div className="border-l pl-10">
          <div className="text-lg font-semibold text-blue-600 mb-4">
            Opportunity Δ
          </div>

          <div className="space-y-6">
            {oppTop.length === 0 ? (
              <EmptyRow label="표시할 급등 Opportunity Δ가 없습니다." />
            ) : (
              oppTop.map((item) => (
                <DeltaRow
                  key={`opp-${item.company_name}`}
                  name={item.company_name}
                  value={item.value}
                  max={oppMax}
                  tone="opp"
                  onClick={() => onCompanyClick(item.company_name)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DeltaRow({
  name,
  value,
  max,
  tone,
  onClick
}: {
  name: string;
  value: number;
  max: number;
  tone: "risk" | "opp";
  onClick: () => void;
}) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));

  const barColor = tone === "risk" ? "bg-red-500" : "bg-blue-600";
  const valueColor = tone === "risk" ? "text-red-600" : "text-blue-600";

  return (
    <div onClick={onClick} className="cursor-pointer group">
      <div className="flex items-end justify-between">
        <div className="text-lg font-semibold text-gray-900 group-hover:underline">
          {name}
        </div>
        <div className={`text-2xl font-bold ${valueColor}`}>
          +{formatNumber(value)}
        </div>
      </div>

      <div className="mt-3 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
        <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <div className="text-sm text-gray-400 py-8">
      {label}
    </div>
  );
}

function formatNumber(n: number) {
  // 510 -> "510", 1200 -> "1,200"
  return Math.round(n).toLocaleString("en-US");
}