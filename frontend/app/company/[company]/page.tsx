"use client"

import { useEffect, useMemo, useState } from "react"

type DashboardData = {
  company_name: string
  risk_score: number
  opportunity_score: number
  risk_level: string
  opportunity_level: string
  risk_delta: number
  opportunity_delta: number
  momentum_score: number
  updated_at: string
}

type EventItem = {
  article_id?: string
  company_name?: string
  event_type: string
  impact_type: string
  impact_strength: number
  severity_level?: number
  confidence?: number
  signal_category?: string
  industry_tag?: string
  trend_bucket?: string
  created_at?: string
}

type StrategyAction = {
  title?: string
  owner?: string
  timeline?: string
  expected_impact?: string
  evidence?: string[]
}

type StrategyActionsPayload =
  | StrategyAction[]
  | { actions?: StrategyAction[] }
  | null

type StrategyData = {
  company_name?: string
  actions?: StrategyActionsPayload
  updated_at?: string
  strategy_type?: string
  trigger_type?: string
  confidence_score?: number
  momentum_score?: number
  risk_7d?: number
  risk_30d?: number
  opp_7d?: number
  opp_30d?: number
}

type CompanyDetailResponse = {
  dashboard: DashboardData | null
  events: EventItem[]
  strategy: StrategyData | null
}

function formatScore(value: number | null | undefined, digits = 1) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-"
  return value.toFixed(digits)
}

function formatDate(value?: string) {
  if (!value) return "-"
  try {
    return new Date(value).toLocaleString("ko-KR")
  } catch {
    return value
  }
}

function levelColor(level?: string) {
  switch (level) {
    case "HIGH":
      return "bg-red-100 text-red-700 border-red-200"
    case "MED":
      return "bg-yellow-100 text-yellow-700 border-yellow-200"
    case "LOW":
      return "bg-green-100 text-green-700 border-green-200"
    default:
      return "bg-gray-100 text-gray-700 border-gray-200"
  }
}

function impactColor(type?: string) {
  return type === "risk"
    ? "bg-red-50 text-red-700 border-red-200"
    : "bg-blue-50 text-blue-700 border-blue-200"
}

function deltaColor(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "text-gray-500"
  if (value > 0) return "text-red-600"
  if (value < 0) return "text-blue-600"
  return "text-gray-500"
}

function normalizeStrategyActions(strategy: StrategyData | null): StrategyAction[] {
  if (!strategy) return []

  const raw = strategy.actions

  if (Array.isArray(raw)) {
    return raw
  }

  if (raw && Array.isArray(raw.actions)) {
    return raw.actions
  }

  return []
}

export default function CompanyDetailPage({
  params,
}: {
  params: Promise<{ company: string }>
}) {
  const [companyName, setCompanyName] = useState("")
  const [data, setData] = useState<CompanyDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        const resolved = await params
        if (!mounted) return

        const decodedCompany = decodeURIComponent(resolved.company)
        setCompanyName(decodedCompany)

        const res = await fetch(`/api/company/${encodeURIComponent(decodedCompany)}`)
        const json = await res.json()

        if (!mounted) return
        setData(json)
      } catch (e) {
        console.error("Failed to fetch company detail:", e)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    return () => {
      mounted = false
    }
  }, [params])

  const strategyActions = useMemo(() => normalizeStrategyActions(data?.strategy ?? null), [data])

  if (loading) {
    return <main className="p-6">불러오는 중...</main>
  }

  if (!data || !data.dashboard) {
    return (
      <main className="p-6 space-y-3">
        <h1 className="text-2xl font-bold">{companyName || "회사 상세"}</h1>
        <div className="rounded-xl border p-6 text-gray-500">
          회사 데이터를 찾을 수 없습니다.
        </div>
      </main>
    )
  }

  const dashboard = data.dashboard
  const events = data.events ?? []
  const strategy = data.strategy

  return (
    <main className="p-6 space-y-6">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">{dashboard.company_name}</h1>
            <p className="text-sm text-gray-500 mt-1">기업 리스크 및 전략 분석 리포트</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <span
              className={`rounded-full border px-3 py-1 text-sm font-medium ${levelColor(
                dashboard.risk_level
              )}`}
            >
              Risk {dashboard.risk_level}
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-sm font-medium ${levelColor(
                dashboard.opportunity_level
              )}`}
            >
              Opp {dashboard.opportunity_level}
            </span>
          </div>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Risk Score</div>
          <div className="mt-2 text-3xl font-bold">{formatScore(dashboard.risk_score, 0)}</div>
          <div className={`mt-2 text-sm ${deltaColor(dashboard.risk_delta)}`}>
            Δ {formatScore(dashboard.risk_delta, 2)}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Opportunity Score</div>
          <div className="mt-2 text-3xl font-bold">
            {formatScore(dashboard.opportunity_score, 0)}
          </div>
          <div className={`mt-2 text-sm ${deltaColor(dashboard.opportunity_delta)}`}>
            Δ {formatScore(dashboard.opportunity_delta, 2)}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Risk Δ</div>
          <div className={`mt-2 text-3xl font-bold ${deltaColor(dashboard.risk_delta)}`}>
            {formatScore(dashboard.risk_delta, 0)}
          </div>
          <div className="mt-2 text-sm text-gray-500">최근 구간 변화량</div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Momentum</div>
          <div className="mt-2 text-3xl font-bold">
            {formatScore(dashboard.momentum_score, 1)}
          </div>
          <div className="mt-2 text-sm text-gray-500">
            updated: {formatDate(dashboard.updated_at)}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-2xl font-bold">최근 이벤트</h2>
          <div className="text-sm text-gray-500">{events.length}건</div>
        </div>

        {events.length === 0 ? (
          <div className="text-gray-500">최근 이벤트가 없습니다.</div>
        ) : (
          <div className="space-y-3">
            {events.map((event, idx) => (
              <div
                key={`${event.article_id ?? "event"}-${idx}`}
                className="rounded-xl border p-4"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-lg font-semibold">{event.event_type}</div>
                    <div className="mt-2 flex gap-2 flex-wrap">
                      <span
                        className={`rounded-full border px-2 py-1 text-xs font-medium ${impactColor(
                          event.impact_type
                        )}`}
                      >
                        {event.impact_type}
                      </span>
                      {event.signal_category && (
                        <span className="rounded-full border px-2 py-1 text-xs text-gray-700">
                          {event.signal_category}
                        </span>
                      )}
                      {event.industry_tag && (
                        <span className="rounded-full border px-2 py-1 text-xs text-gray-700">
                          {event.industry_tag}
                        </span>
                      )}
                      {event.trend_bucket && (
                        <span className="rounded-full border px-2 py-1 text-xs text-gray-700">
                          {event.trend_bucket}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-sm text-gray-500">{formatDate(event.created_at)}</div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">Impact Strength</div>
                    <div className="mt-1 text-lg font-semibold">
                      {formatScore(event.impact_strength, 0)}
                    </div>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">Severity</div>
                    <div className="mt-1 text-lg font-semibold">
                      {formatScore(event.severity_level, 0)}
                    </div>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">Confidence</div>
                    <div className="mt-1 text-lg font-semibold">
                      {formatScore(event.confidence, 2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-2xl font-bold">실행 전략</h2>
          <div className="text-sm text-gray-500">
            생성일: {strategy?.updated_at ? formatDate(strategy.updated_at) : "-"}
          </div>
        </div>

        {strategyActions.length === 0 ? (
          <div className="text-gray-500">생성된 전략이 없습니다.</div>
        ) : (
          <div className="space-y-4">
            {strategyActions.map((action, idx) => (
              <div key={idx} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-lg font-semibold">
                      {idx + 1}. {action.title || "전략"}
                    </div>
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {action.owner && (
                        <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                          {action.owner}
                        </span>
                      )}
                      {action.timeline && (
                        <span className="rounded-full bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700">
                          {action.timeline}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-sm text-gray-700">
                  {action.expected_impact || "-"}
                </div>

                {action.evidence && action.evidence.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs text-gray-500 mb-2">Evidence</div>
                    <div className="flex gap-2 flex-wrap">
                      {action.evidence.map((ev, evIdx) => (
                        <span
                          key={evIdx}
                          className="rounded-full border px-2 py-1 text-xs text-gray-700"
                        >
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {strategy && (
              <div className="grid gap-3 md:grid-cols-3 pt-2">
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs text-gray-500">Confidence Score</div>
                  <div className="mt-1 text-lg font-semibold">
                    {formatScore(strategy.confidence_score, 2)}
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs text-gray-500">Risk 7D / 30D</div>
                  <div className="mt-1 text-lg font-semibold">
                    {formatScore(strategy.risk_7d, 1)} / {formatScore(strategy.risk_30d, 1)}
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs text-gray-500">Opp 7D / 30D</div>
                  <div className="mt-1 text-lg font-semibold">
                    {formatScore(strategy.opp_7d, 1)} / {formatScore(strategy.opp_30d, 1)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  )
}