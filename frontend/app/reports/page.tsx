"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type ReportRow = {
  report_date: string
  summary: any
}

function parseSummary(summary: any) {
  if (!summary) return null

  if (typeof summary === "object") {
    return summary
  }

  if (typeof summary === "string") {
    try {
      return JSON.parse(summary)
    } catch {
      return null
    }
  }

  return null
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch("/api/reports")
        const data = await res.json()
        setReports(Array.isArray(data) ? data : [])
      } catch (e) {
        console.error("Failed to fetch reports:", e)
      } finally {
        setLoading(false)
      }
    }

    fetchReports()
  }, [])

  if (loading) return <div className="p-6">불러오는 중...</div>

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Daily Reports</h1>

      {reports.length === 0 ? (
        <div>리포트가 없습니다.</div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const parsed = parseSummary(report.summary)

            return (
              <Link
                key={report.report_date}
                href={`/reports/${report.report_date}`}
                className="block rounded-xl border p-4 hover:bg-gray-50"
              >
                <div className="font-semibold">{report.report_date}</div>
                <div className="mt-2 text-sm text-gray-600">
                  {parsed?.industry_summary || "리포트 요약 보기"}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}