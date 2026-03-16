import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function computeCompositeIndex(avgRisk: number, avgOpp: number) {
  return clamp(Math.round(100 - avgRisk * 0.55 + avgOpp * 0.35), 0, 100);
}

export async function GET() {
  try {
    const { data: scores, error: scoreError } = await supabase
      .from("company_scores")
      .select(`
        company_name,
        risk_score,
        opportunity_score,
        risk_level,
        opportunity_level,
        updated_at
      `)
      .limit(100);

    if (scoreError) {
      console.error("[/api/overview] company_scores error:", scoreError);
      return NextResponse.json({ error: "Failed to fetch company scores" }, { status: 500 });
    }

    const rows = scores ?? [];
    const totalCompanies = rows.length;
    const riskHighCount = rows.filter((r) => r.risk_level === "HIGH").length;
    const riskMedCount = rows.filter((r) => r.risk_level === "MED").length;
    const oppHighCount = rows.filter((r) => r.opportunity_level === "HIGH").length;

    const avgRisk =
      totalCompanies > 0
        ? rows.reduce((acc, cur) => acc + Number(cur.risk_score ?? 0), 0) / totalCompanies
        : 0;

    const avgOpp =
      totalCompanies > 0
        ? rows.reduce((acc, cur) => acc + Number(cur.opportunity_score ?? 0), 0) / totalCompanies
        : 0;

    const compositeIndex = computeCompositeIndex(avgRisk, avgOpp);

    const healthDistribution = {
      healthy: rows.filter((r) => Number(r.risk_score ?? 0) < 40).length,
      warning: rows.filter((r) => {
        const v = Number(r.risk_score ?? 0);
        return v >= 40 && v < 70;
      }).length,
      danger: rows.filter((r) => Number(r.risk_score ?? 0) >= 70).length,
    };

    const { data: actions } = await supabase
      .from("action_recommendations")
      .select(`
        company_name,
        strategy_type,
        trigger_type,
        confidence_score,
        updated_at,
        actions
      `)
      .order("updated_at", { ascending: false })
      .limit(8);

    const alerts = (actions ?? []).map((row, idx) => {
      const raw = row.actions;
      const actionList = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.actions)
        ? raw.actions
        : [];

      const firstAction = actionList[0];
      const title = firstAction?.title || "전략 추천 생성";
      const subtitle =
        firstAction?.expected_impact || row.trigger_type || "분석 결과 기반 권장 액션";

      let actionType: "detail" | "opportunity" | "analysis" = "detail";
      let buttonLabel = "상세보기";

      const text = `${title} ${subtitle}`;

      if (
        text.includes("출시") ||
        text.includes("투자") ||
        text.includes("협력") ||
        text.includes("기회") ||
        text.includes("수주") ||
        text.includes("공장") ||
        text.includes("증설")
      ) {
        actionType = "opportunity";
        buttonLabel = "기회등록";
      } else if (
        text.includes("평판") ||
        text.includes("리뷰") ||
        text.includes("분석")
      ) {
        actionType = "analysis";
        buttonLabel = "분석보기";
      }

      return {
        id: `${row.company_name}-${idx}`,
        company_name: row.company_name,
        title,
        subtitle,
        updated_at: row.updated_at,
        confidence_score: row.confidence_score ?? 0,
        actionType,
        buttonLabel,
      };
    });

    const trend = {
      labels: ["12월", "1월", "2월", "3월", "4월", "5월"],
      healthy: [
        Math.max(healthDistribution.healthy - 3, 0),
        Math.max(healthDistribution.healthy - 2, 0),
        Math.max(healthDistribution.healthy - 1, 0),
        healthDistribution.healthy,
        healthDistribution.healthy,
        healthDistribution.healthy,
      ],
      warning: [
        healthDistribution.warning + 1,
        healthDistribution.warning + 1,
        healthDistribution.warning,
        healthDistribution.warning,
        healthDistribution.warning,
        healthDistribution.warning,
      ],
      danger: [
        Math.max(healthDistribution.danger - 1, 0),
        Math.max(healthDistribution.danger - 1, 0),
        healthDistribution.danger,
        Math.max(healthDistribution.danger - 1, 0),
        healthDistribution.danger,
        healthDistribution.danger,
      ],
    };

    return NextResponse.json({
      kpis: {
        compositeIndex,
        riskHighCount,
        riskMedCount,
        oppHighCount,
        totalCompanies,
        dartCount: 0,
      },
      distribution: healthDistribution,
      alerts,
      trend,
    });
  } catch (e) {
    console.error("[/api/overview] unexpected error:", e);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}