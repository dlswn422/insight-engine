"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import CompanyRiskList from "./companyRiskList";
import DeltaTopCard from "./deltaTopCard";
import KpiCards from "./kpiCards";

export interface Company {
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
        const sorted = (res as Company[]).sort(
          (a, b) => b.risk_score - a.risk_score
        );
        setData(sorted);
        setLoading(false);
      })
      .catch(() => {
        setData([]);
        setLoading(false);
      });
  }, []);

  const goCompany = (companyName: string) => {
    router.push(`/company/${encodeURIComponent(companyName)}`);
  };

  const highRisk = data.filter((d) => d.risk_level === "HIGH").length;
  const highOpportunity = data.filter((d) => d.opportunity_level === "HIGH").length;
  const spike = data.filter((d) => d.risk_delta > 30).length;

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-8">📊 Market & Opportunity Radar</h1>

      <KpiCards highRisk={highRisk} highOpportunity={highOpportunity} spike={spike} />

      {/* ⭐ 하단 카드 두 개 */}
      <div className="grid grid-cols-2 gap-6 mt-6">
        <CompanyRiskList data={data} loading={loading} onCompanyClick={goCompany} />
        <DeltaTopCard data={data} onCompanyClick={goCompany} />
      </div>
    </main>
  );
}