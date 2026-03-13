"use client";

import { useEffect, useState } from "react";
import { parseReportSummary } from "@/lib/reportSummary";

type ReportDetail = {
  report_date: string;
  summary: unknown;
};

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const [date, setDate] = useState<string>("");
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const resolved = await params;
        if (!mounted) return;

        setDate(resolved.date);

        const res = await fetch(`/api/reports/${resolved.date}`);
        const data = await res.json();

        if (!mounted) return;
        setReport(data);
      } catch (e) {
        console.error("Failed to fetch report:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [params]);

  if (loading) {
    return (
      <main className="reports-page">
        <div className="reports-header">
          <h1>Daily Report</h1>
          <p>리포트를 불러오는 중입니다.</p>
        </div>
        <div className="reports-empty-card">불러오는 중...</div>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="reports-page">
        <div className="reports-header">
          <h1>Daily Report</h1>
          <p>리포트를 찾을 수 없습니다.</p>
        </div>
        <div className="reports-empty-card">리포트를 찾을 수 없습니다.</div>
      </main>
    );
  }

  const parsed = parseReportSummary(report.summary);

  return (
    <main className="reports-page">
      <div className="reports-header">
        <h1>Daily Report</h1>
        <p>{date}</p>
      </div>

      <section className="report-detail-card">
        <div className="report-section-title">산업 요약</div>
        <p className="report-paragraph">{parsed?.industry_summary || "-"}</p>
      </section>

      <section className="report-detail-card">
        <div className="report-section-title">Top Trends</div>
        <div className="report-grid">
          {(parsed?.top_trends || []).map((trend: any, idx: number) => (
            <div key={idx} className="report-sub-card">
              <div className="report-sub-card-title">
                {trend.industry_tag || "-"} / {trend.trend_bucket || "-"} /{" "}
                {trend.signal_category || "-"}
              </div>
              <div className="report-sub-card-text">{trend.why_it_matters || "-"}</div>
              {trend.examples?.length ? (
                <div className="report-chip-row">
                  {trend.examples.map((ex: string, i: number) => (
                    <span key={i} className="report-chip">
                      {ex}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="report-detail-card">
        <div className="report-section-title">Risk Watchlist</div>
        <div className="report-grid">
          {(parsed?.risk_watchlist || []).map((item: any, idx: number) => (
            <div key={idx} className="report-sub-card">
              <div className="report-sub-card-title">
                {item.company_name || "-"} (Risk {item.risk_score ?? "-"})
              </div>
              <div className="report-sub-card-text">
                Delta: {item.risk_delta ?? "-"}
              </div>
              <div className="report-sub-card-text">
                권고: {item.recommended_action || "-"}
              </div>
            </div>
          ))}
          </div>
          </section>

          <section className="report-detail-card">
          <div className="report-section-title">Opportunity Watchlist</div>
          <div className="report-grid">
          {(parsed?.opportunity_watchlist || []).map((item: any, idx: number) => (
            <div key={idx} className="report-sub-card">
              <div className="report-sub-card-title">
                {item.company_name || "-"} (Opp {item.opportunity_score ?? "-"})
              </div>
              <div className="report-sub-card-text">
                Delta: {item.opportunity_delta ?? "-"}
              </div>
              <div className="report-sub-card-text">
                권고: {item.recommended_action || "-"}
              </div>
            </div>
          ))}
          </div>
          </section>

      <section className="report-detail-card">
        <div className="report-section-title">Overall Strategy</div>
        <p className="report-paragraph">{parsed?.overall_strategy || "-"}</p>
      </section>
    </main>
  );
}