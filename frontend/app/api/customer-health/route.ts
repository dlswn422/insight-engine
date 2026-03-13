import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getCompanyRoles, normalizeName } from "@/lib/company-service";

type HealthStatus = "danger" | "warning" | "healthy";

function toHealthScore(riskScore: number, oppScore: number) {
  const base = 100 - riskScore * 0.7 + oppScore * 0.15;
  return Math.max(0, Math.min(100, Math.round(base)));
}

function toChurnRisk(riskScore: number) {
  return Math.max(0, Math.min(100, Math.round(riskScore)));
}

function toStatus(score: number): HealthStatus {
  if (score < 45) return "danger";
  if (score < 70) return "warning";
  return "healthy";
}

function factorScoresFromSignals(signalTags: string[]) {
  const text = signalTags.join(" ");

  const scoreIfIncludes = (keywords: string[], base: number) =>
    keywords.some((k) => text.includes(k)) ? base : 1;

  return {
    order_drop: scoreIfIncludes(["발주 감소", "수요 감소", "매출 감소"], 5),
    contact_gap: scoreIfIncludes(["소통 단절", "응답 지연", "연락 두절"], 4),
    competitor_touch: scoreIfIncludes(["경쟁", "경쟁사", "시장 점유"], 4),
    claim_issue: scoreIfIncludes(["클레임", "불만", "품질"], 3),
    bid_miss: scoreIfIncludes(["입찰 불참", "입찰", "제안 미응답"], 4),
    owner_change: scoreIfIncludes(["담당자 교체", "조직 개편", "인사"], 3),
  };
}

export async function GET() {
  try {
    // 1. 기업 분류 맵 가져오기
    const roleMap = await getCompanyRoles();

    // 2. 모든 점수 데이터 가져오기 (컬럼 부재로 필터링 제거)
    const { data: scoreRows, error: scoreError } = await supabase
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
      .order("risk_score", { ascending: false })
      .limit(200);

    if (scoreError) {
      console.error("[/api/customer-health] company_scores error:", scoreError);
      return NextResponse.json(
        { error: "Failed to fetch company scores" },
        { status: 500 }
      );
    }

    // 3. CLIENT 기업만 필터링
    const allRows = scoreRows ?? [];
    const clientRows = allRows.filter((r) => {
      const norm = normalizeName(r.company_name);
      return roleMap.get(norm)?.role === "CLIENT";
    });

    const companies = clientRows.map((row) => row.company_name);

    if (companies.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const { data: signalRows } = await supabase
      .from("signals")
      .select(`
        company_name,
        event_type,
        impact_type,
        signal_category,
        created_at
      `)
      .in("company_name", companies)
      .order("created_at", { ascending: false });

    const signalMap = new Map<string, any[]>();
    for (const row of signalRows ?? []) {
      const arr = signalMap.get(row.company_name) ?? [];
      arr.push(row);
      signalMap.set(row.company_name, arr);
    }

    const items = clientRows.map((row) => {
      const company = row.company_name;
      const riskScore = Number(row.risk_score ?? 0);
      const oppScore = Number(row.opportunity_score ?? 0);

      const healthScore = toHealthScore(riskScore, oppScore);
      const churnRisk = toChurnRisk(riskScore);
      const status = toStatus(healthScore);

      const recentSignals = (signalMap.get(company) ?? []).slice(0, 5);
      const signalTags = recentSignals.map((s) => s.event_type).filter(Boolean);

      const factors = factorScoresFromSignals(signalTags);

      const orderTrend = Math.max(
        -25,
        Math.min(18, Math.round((oppScore - riskScore) * 0.25))
      );

      return {
        company_name: company,
        status,
        health_score: healthScore,
        churn_risk: churnRisk,
        risk_score: riskScore,
        opportunity_score: oppScore,
        risk_delta: Number(row.risk_delta ?? 0),
        opportunity_delta: Number(row.opportunity_delta ?? 0),
        signal_tags: signalTags.length > 0 ? signalTags : ["신호 없음"],
        updated_at: row.updated_at,
        order_trend: orderTrend,
        factors,
      };
    });

    return NextResponse.json({ items });
  } catch (e) {
    console.error("[/api/customer-health] unexpected error:", e);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
