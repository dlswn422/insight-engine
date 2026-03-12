"use client"

import { useEffect, useState } from "react"

type ReportDetail = {
  report_date: string
  summary: any
}

function parseSummary(summary: any) {
  if (!summary) return null

  // 이미 object면 그대로 사용
  if (typeof summary === "object") {
    return summary
  }

  // 문자열이면 JSON 파싱 시도
  if (typeof summary === "string") {
    try {
      return JSON.parse(summary)
    } catch {
      return null
    }
  }

  return null
}

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ date: string }>
}) {
  const [date, setDate] = useState<string>("")
  const [report, setReport] = useState<ReportDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        const resolved = await params
        if (!mounted) return

        setDate(resolved.date)

        const res = await fetch(`/api/reports/${resolved.date}`)
        const data = await res.json()

        if (!mounted) return
        setReport(data)
      } catch (e) {
        console.error("Failed to fetch report:", e)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    return () => {
      mounted = false
    }
  }, [params])

  if (loading) return <div className="p-6">불러오는 중...</div>
  if (!report) return <div className="p-6">리포트를 찾을 수 없습니다.</div>

  const parsed = parseSummary(report.summary)

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Daily Report - {date}</h1>

      <section>
        <h2 className="text-lg font-semibold mb-2">산업 요약</h2>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">
          {parsed?.industry_summary || "-"}
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Top Trends</h2>
        <div className="space-y-3">
          {(parsed?.top_trends || []).map((trend: any, idx: number) => (
            <div key={idx} className="rounded-lg border p-3">
              <div className="font-medium">
                {trend.industry_tag} / {trend.trend_bucket} / {trend.signal_category}
              </div>
              <div className="text-sm text-gray-700 mt-1">
                {trend.why_it_matters}
              </div>
              {trend.examples?.length > 0 && (
                <ul className="mt-2 text-sm text-gray-600 list-disc pl-5">
                  {trend.examples.map((ex: string, i: number) => (
                    <li key={i}>{ex}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Risk Watchlist</h2>
        <div className="space-y-3">
          {(parsed?.risk_watchlist || []).map((item: any, idx: number) => (
            <div key={idx} className="rounded-lg border p-3">
              <div className="font-medium">
                {item.company_name} (Risk {item.risk_score})
              </div>
              <div className="text-sm text-gray-700 mt-1">
                Delta: {item.risk_delta}
              </div>
              <div className="text-sm text-gray-700 mt-1">
                권고: {item.recommended_action}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Opportunity Moves</h2>
        <div className="space-y-3">
          {(parsed?.opportunity_moves || []).map((item: any, idx: number) => (
            <div key={idx} className="rounded-lg border p-3">
              <div className="font-medium">
                {item.company_name} (Opp {item.opportunity_score})
              </div>
              <div className="text-sm text-gray-700 mt-1">
                Delta: {item.opportunity_delta}
              </div>
              <div className="text-sm text-gray-700 mt-1">
                권고: {item.recommended_action}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Overall Strategy</h2>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">
          {parsed?.overall_strategy || "-"}
        </p>
      </section>
    </main>
  )
}