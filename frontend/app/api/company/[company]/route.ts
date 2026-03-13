import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { normalizeName } from "@/lib/company-service"

type RouteContext = {
  params: Promise<{
    company: string
  }>
}

function normalizeParamName(name: string) {
  return normalizeName(decodeURIComponent(name))
}

async function fetchDashboard(companyName: string) {
  const exact = await supabase
    .from("company_scores")
    .select(`
      company_name,
      risk_score,
      opportunity_score,
      risk_level,
      opportunity_level,
      risk_delta,
      opportunity_delta,
      momentum_score,
      updated_at
    `)
    .eq("company_name", companyName)
    .maybeSingle()

  if (exact.data || exact.error) return exact

  return await supabase
    .from("company_scores")
    .select(`
      company_name,
      risk_score,
      opportunity_score,
      risk_level,
      opportunity_level,
      risk_delta,
      opportunity_delta,
      momentum_score,
      updated_at
    `)
    .ilike("company_name", companyName)
    .maybeSingle()
}

async function fetchEvents(companyName: string) {
  const exact = await supabase
    .from("signals")
    .select(`
      article_id,
      company_name,
      event_type,
      impact_type,
      impact_strength,
      severity_level,
      confidence,
      signal_category,
      industry_tag,
      trend_bucket,
      created_at
    `)
    .eq("company_name", companyName)
    .order("created_at", { ascending: false })
    .limit(20)

  if ((exact.data?.length ?? 0) > 0 || exact.error) return exact

  return await supabase
    .from("signals")
    .select(`
      article_id,
      company_name,
      event_type,
      impact_type,
      impact_strength,
      severity_level,
      confidence,
      signal_category,
      industry_tag,
      trend_bucket,
      created_at
    `)
    .ilike("company_name", companyName)
    .order("created_at", { ascending: false })
    .limit(20)
}

async function fetchStrategy(companyName: string) {
  const exact = await supabase
    .from("action_recommendations")
    .select(`
      company_name,
      actions,
      updated_at,
      strategy_type,
      trigger_type,
      confidence_score,
      momentum_score,
      risk_7d,
      risk_30d,
      opp_7d,
      opp_30d
    `)
    .eq("company_name", companyName)
    .maybeSingle()

  if (exact.data || exact.error) return exact

  return await supabase
    .from("action_recommendations")
    .select(`
      company_name,
      actions,
      updated_at,
      strategy_type,
      trigger_type,
      confidence_score,
      momentum_score,
      risk_7d,
      risk_30d,
      opp_7d,
      opp_30d
    `)
    .ilike("company_name", companyName)
    .maybeSingle()
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { company } = await context.params
    const companyName = normalizeParamName(company)

    const { data: dashboard, error: dashboardError } = await fetchDashboard(companyName)
    if (dashboardError) {
      console.error("[/api/company] dashboard error:", dashboardError)
      return NextResponse.json(
        { error: "Failed to fetch company dashboard" },
        { status: 500 }
      )
    }

    const { data: events, error: eventsError } = await fetchEvents(companyName)
    if (eventsError) {
      console.error("[/api/company] events error:", eventsError)
      return NextResponse.json(
        { error: "Failed to fetch company events" },
        { status: 500 }
      )
    }

    const { data: strategy, error: strategyError } = await fetchStrategy(companyName)
    if (strategyError) {
      console.error("[/api/company] strategy error:", strategyError)
      return NextResponse.json(
        { error: "Failed to fetch company strategy" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      dashboard: dashboard ?? null,
      events: events ?? [],
      strategy: strategy ?? null,
    })
  } catch (e) {
    console.error("[/api/company] unexpected error:", e)
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    )
  }
}