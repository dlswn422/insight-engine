"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { parseReportSummary } from "@/lib/reportSummary";

type ReportRow = {
  report_date: string;
  summary: unknown;
};

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch("/api/reports");
        const data = await res.json();
        setReports(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to fetch reports:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  if (loading) {
    return (
      <main className="reports-page">
        <div className="reports-header">
          <h1>Daily Reports</h1>
          <p>일일 기회/위험 리포트를 불러오는 중입니다.</p>
        </div>
        <div className="reports-empty-card">불러오는 중...</div>
      </main>
    );
  }

  return (
    <main className="reports-page">
      <div className="reports-header">
        <h1>Daily Reports</h1>
        <p>일일 산업 분석 리포트와 기회/위험 요약을 확인합니다.</p>
      </div>

      {reports.length === 0 ? (
        <div className="reports-empty-card">리포트가 없습니다.</div>
      ) : (
        <div className="reports-list">
          {reports.map((report) => {
            const parsed = parseReportSummary(report.summary);

            return (
              <Link
                key={report.report_date}
                href={`/reports/${report.report_date}`}
                className="report-list-card"
              >
                <div className="report-list-card-top">
                  <div>
                    <div className="report-list-date">{report.report_date}</div>
                    <div className="report-list-title">일일 레이더 리포트</div>
                  </div>
                  <span className="report-list-chip">상세 보기</span>
                </div>

                <div className="report-list-summary">
                  {parsed?.industry_summary || "리포트 요약 보기"}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}