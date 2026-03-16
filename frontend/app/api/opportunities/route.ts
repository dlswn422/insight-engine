/**
 * Opportunities API
 *
 * 주의:
 * - priority(urgent/high/medium), estimatedRevenue, trigger 기반 카드는
 *   최근 signal과 score를 이용한 규칙 기반 영업 기회 분류 결과다.
 * - 실제 수주 금액 예측 모델의 결과가 아니라, 영업 우선순위 참고용 heuristic이다.
 */

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

type OpportunityPriority = "urgent" | "high" | "medium"

type OpportunityItem = {
  id: string
  priority: OpportunityPriority
  company: string
  trigger: string
  desc: string
  amount: string
  amountValue: number
  source: string
  date: string
  product: string
  action: string
}

// priority:
// urgent / high / medium 분류는 최근 신호 강도와 score 기반 규칙값.
// 실제 영업 단계(Stage)와 1:1 대응되지 않는 운영 참고용 우선순위다.
function decidePriority(score: number): OpportunityPriority {
  if (score >= 85) return "urgent"
  if (score >= 60) return "high"
  return "medium"
}

function estimateRevenue(score: number): number {
  if (score >= 90) return 12.0
  if (score >= 80) return 9.0
  if (score >= 70) return 6.0
  if (score >= 60) return 4.0
  return 2.5
}

function formatAmount(value: number) {
  return `약 ${value.toFixed(1)}억/년`
}

function sourceLabelFromSignal(signalCategory?: string, eventType?: string) {
  const et = eventType || ""
  if (et.includes("공시")) return "DART 공시"
  if (et.includes("허가") || et.includes("승인")) return "식약처 공시"
  if (signalCategory === "Investment") return "투자 뉴스"
  if (signalCategory === "Product") return "신제품 발표"
  if (signalCategory === "Partnership") return "업계 뉴스"
  return "업계 뉴스"
}

function actionLabelFromPriority(priority: OpportunityPriority) {
  if (priority === "urgent") return "이번 주 영업팀 접촉"
  if (priority === "high") return "1주 내 접촉"
  return "추이 관찰 후 접촉"
}

export async function GET() {
  try {
    const { data: scoreRows, error: scoreError } = await supabase
      .from("company_scores")
      .select(`
        company_name,
        opportunity_score,
        opportunity_level,
        opportunity_delta,
        momentum_score,
        updated_at
      `)
      .gt("opportunity_score", 0)
      .order("opportunity_score", { ascending: false })
      .limit(20)

    if (scoreError) {
      console.error("[/api/opportunities] company_scores error:", scoreError)
      return NextResponse.json({ error: "Failed to fetch scores" }, { status: 500 })
    }

    const companies = (scoreRows ?? []).map((row) => row.company_name)
    if (companies.length === 0) {
      return NextResponse.json({
        summary: {
          urgentCount: 0,
          highCount: 0,
          mediumCount: 0,
          estimatedRevenue: 0,
        },
        items: [],
        sourceData: { labels: [], values: [] },
        revenueData: { labels: [], values: [] },
      })
    }

    const { data: strategyRows } = await supabase
      .from("action_recommendations")
      .select("company_name, actions, updated_at")
      .in("company_name", companies)

    const { data: signalRows } = await supabase
      .from("signals")
      .select(`
        company_name,
        event_type,
        signal_category,
        industry_tag,
        trend_bucket,
        created_at,
        impact_strength,
        confidence
      `)
      .in("company_name", companies)
      .eq("impact_type", "opportunity")
      .order("created_at", { ascending: false })

    const strategyMap = new Map<string, any>()
    for (const row of strategyRows ?? []) {
      strategyMap.set(row.company_name, row)
    }

    const signalMap = new Map<string, any[]>()
    for (const row of signalRows ?? []) {
      const arr = signalMap.get(row.company_name) ?? []
      arr.push(row)
      signalMap.set(row.company_name, arr)
    }

    const items: OpportunityItem[] = (scoreRows ?? []).map((row, idx) => {
      const company = row.company_name
      const score = Number(row.opportunity_score ?? 0)

      const priority = decidePriority(score)
      const topSignal = (signalMap.get(company) ?? [])[0]
      const revenue = estimateRevenue(score)

      const strategy = strategyMap.get(company)
      const strategyActionsRaw = strategy?.actions
      const strategyActions = Array.isArray(strategyActionsRaw)
        ? strategyActionsRaw
        : Array.isArray(strategyActionsRaw?.actions)
        ? strategyActionsRaw.actions
        : []
        
      // trigger / action:
      // 최근 기사/신호를 바탕으로 만든 설명 문구 및 권장 액션.
      // 영업 담당자 참고용 텍스트이며 확정 지시값은 아니다.
      const trigger = topSignal?.event_type || strategyActions?.[0]?.title || "기회 신호 감지"

      // source:
// signal_category / event_type를 기반으로 화면용으로 단순화한 출처 라벨.
// 원문 기사 출처명이 아니라 기회 성격을 빠르게 구분하기 위한 집계형 표시값이다.
      const source = sourceLabelFromSignal(topSignal?.signal_category, topSignal?.event_type)
      const desc =
        strategyActions?.[0]?.expected_impact ||
        `${company}의 최근 기회 점수 ${score.toFixed(1)} 기반으로 영업 기회가 감지되었습니다.`

      const dateValue = topSignal?.created_at || row.updated_at
      const date = dateValue ? new Date(dateValue).toLocaleDateString("ko-KR") : "-"

      return {
        id: `${company}-${idx}`,
        priority,
        company,
        trigger,
        desc,
        amount: formatAmount(revenue),
        amountValue: revenue,
        source,
        date,
        product: topSignal?.industry_tag || "기회",
        action: strategyActions?.[0]?.title || actionLabelFromPriority(priority),
      }
    })

    const urgentCount = items.filter((i) => i.priority === "urgent").length
    const highCount = items.filter((i) => i.priority === "high").length
    const mediumCount = items.filter((i) => i.priority === "medium").length

    // estimatedRevenue:
    // opportunity_score 또는 signal 강도를 구간화해 만든 예상 매출 지표.
    // 실제 계약 가능 금액을 예측한 모델값이 아니라,
    // 영업 우선순위를 보여주기 위한 화면용 추정치다.
    const estimatedRevenue = items.reduce((acc, cur) => acc + cur.amountValue, 0)

    const sourceCountMap = new Map<string, number>()
    for (const item of items) {
      sourceCountMap.set(item.source, (sourceCountMap.get(item.source) ?? 0) + 1)
    }

    const sourceData = {
      labels: Array.from(sourceCountMap.keys()),
      values: Array.from(sourceCountMap.values()),
    }

    const revenueTop = [...items]
      .sort((a, b) => b.amountValue - a.amountValue)
      .slice(0, 5)

    const revenueData = {
      labels: revenueTop.map((item) => item.company),
      values: revenueTop.map((item) => item.amountValue),
    }

    return NextResponse.json({
      summary: {
        urgentCount,
        highCount,
        mediumCount,
        estimatedRevenue,
      },
      items,
      sourceData,
      revenueData,
    })
  } catch (e) {
    console.error("[/api/opportunities] unexpected error:", e)
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 })
  }
}