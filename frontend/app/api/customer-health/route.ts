/**
 * Customer Health API
 *
 * 주의:
 * - health_score / churn_risk / order_trend / factors는
 *   일부 실원천 신호와 일부 heuristic 계산을 결합한 운영 참고용 지표다.
 * - 실제 CRM/ERP 확정 수치가 아니라, 최근 신호를 정규화/가중합한 파생값이 포함된다.
 * - 화면의 레이더 차트, 발주량 변동 차트는 설명용 파생 시각화다.
 */

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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
      .limit(30);

    if (scoreError) {
      console.error("[/api/customer-health] company_scores error:", scoreError);
      return NextResponse.json(
        { error: "Failed to fetch company scores" },
        { status: 500 }
      );
    }

    const companies = (scoreRows ?? []).map((row) => row.company_name);

    if (companies.length === 0) {
      return NextResponse.json({
        items: [],
        meta: {
          health_score: "heuristic",
          churn_risk: "heuristic",
          status: "heuristic",
          signal_tags: "aggregated",
          order_trend: "heuristic",
          factors: "synthetic",
        },
      });
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

    const items = (scoreRows ?? []).map((row) => {
      const company = row.company_name;
      const riskScore = Number(row.risk_score ?? 0);
      const oppScore = Number(row.opportunity_score ?? 0);
      // health_score:
      // 최근 signal과 가중 규칙을 기반으로 계산한 건강도 점수.
      // 확정 진단값이 아니라 고객 상태를 빠르게 비교하기 위한 인덱스다.
      const healthScore = toHealthScore(riskScore, oppScore);

      // churn_risk:
      // 최근 위험 신호를 기반으로 계산한 이탈 가능성 점수.
      // 실제 이탈 예측 모델 확률값이 아니라 규칙 기반 운영 참고용 값이다.
      const churnRisk = toChurnRisk(riskScore);

      const status = toStatus(healthScore);

      const recentSignals = (signalMap.get(company) ?? []).slice(0, 5);
      const signalTags = recentSignals.map((s) => s.event_type).filter(Boolean);

      // factors:
      // 레이더 차트 시각화를 위한 파생 점수.
      // 각 항목은 원천 이벤트를 0~5 범위로 정규화한 설명용 값이다.
      const factors = factorScoresFromSignals(signalTags);

      // order_trend:
      // 실제 발주 원장 합계의 증감률이 아니라,
      // risk_score / opportunity_score 차이를 기반으로 만든 추정 변동치다.
      // 화면에서 "발주량 변동"으로 보이지만, 운영 참고용 heuristic이다.
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

    return NextResponse.json({
      items,
      meta: {
        risk_score: "aggregated",
        opportunity_score: "aggregated",
        risk_delta: "aggregated",
        opportunity_delta: "aggregated",
        health_score: "heuristic",
        churn_risk: "heuristic",
        status: "heuristic",
        signal_tags: "aggregated",
        order_trend: "heuristic",
        factors: "synthetic",
      },
    });
  } catch (e) {
    console.error("[/api/customer-health] unexpected error:", e);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}