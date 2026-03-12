"use client";

import { useEffect, useState } from "react";
import OpportunitySummary from "./OpportunitySummary";
import PipelineBoard from "./PipelineBoard";
import OpportunityChartsRow from "./OpportunityChartsRow";

export type OpportunityPriority = "urgent" | "high" | "medium";

export type OpportunityItem = {
  id: string;
  priority: OpportunityPriority;
  company: string;
  trigger: string;
  desc: string;
  amount: string;
  amountValue: number;
  source: string;
  date: string;
  product: string;
  action: string;
};

export type OpportunityApiResponse = {
  summary: {
    urgentCount: number;
    highCount: number;
    mediumCount: number;
    estimatedRevenue: number;
  };
  items: OpportunityItem[];
  sourceData: {
    labels: string[];
    values: number[];
  };
  revenueData: {
    labels: string[];
    values: number[];
  };
};

const EMPTY_DATA: OpportunityApiResponse = {
  summary: {
    urgentCount: 0,
    highCount: 0,
    mediumCount: 0,
    estimatedRevenue: 0,
  },
  items: [],
  sourceData: {
    labels: [],
    values: [],
  },
  revenueData: {
    labels: [],
    values: [],
  },
};

export default function OpportunitySection() {
  const [data, setData] = useState<OpportunityApiResponse>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/opportunities");
        const json = await res.json();

        if (!res.ok) {
          console.error("Opportunity API error:", json);
          setData(EMPTY_DATA);
          return;
        }

        setData({
          summary: json?.summary ?? EMPTY_DATA.summary,
          items: Array.isArray(json?.items) ? json.items : [],
          sourceData: {
            labels: Array.isArray(json?.sourceData?.labels)
              ? json.sourceData.labels
              : [],
            values: Array.isArray(json?.sourceData?.values)
              ? json.sourceData.values
              : [],
          },
          revenueData: {
            labels: Array.isArray(json?.revenueData?.labels)
              ? json.revenueData.labels
              : [],
            values: Array.isArray(json?.revenueData?.values)
              ? json.revenueData.values
              : [],
          },
        });
      } catch (e) {
        console.error("Failed to fetch opportunities:", e);
        setData(EMPTY_DATA);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <section className="section active" id="section-opportunity">
      <div className="section-header">
        <h1>
          <i className="fas fa-rocket"></i> Opportunity Pipeline
        </h1>
        <p>AI 기반 신규 영업 기회 자동 발굴 현황</p>
      </div>

      {loading ? (
        <div className="chart-card opportunity-loading-card">불러오는 중...</div>
      ) : (
        <div className="opportunity-page">
          <OpportunitySummary summary={data.summary} />
          <PipelineBoard items={data.items} />
          <OpportunityChartsRow
            sourceData={data.sourceData}
            revenueData={data.revenueData}
          />
        </div>
      )}
    </section>
  );
}