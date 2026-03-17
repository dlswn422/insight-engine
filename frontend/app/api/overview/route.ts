import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getCompanyRoles, normalizeName } from "@/lib/company-service";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function computeCompositeIndex(avgRisk: number, avgOpp: number) {
  return clamp(Math.round(100 - avgRisk * 0.55 + avgOpp * 0.35), 0, 100);
}

export async function GET() {
  try {
    // 1. 기업 분류 맵 가져오기
    const roleMap = await getCompanyRoles();

    // 실제 등록된 고객사(CLIENT) 수 계산
    const managedCount = Array.from(roleMap.values()).filter((info) => info.role === "CLIENT").length;

    // 2. 모든 점수 데이터 가져오기 (컬럼 부재로 필터링 제거)
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
      .limit(1000); // 넉넉하게 가져온 뒤 메모리 필터링

    if (scoreError) {
      console.error("[/api/overview] company_scores error:", scoreError);
      return NextResponse.json({ error: "Failed to fetch company scores" }, { status: 500 });
    }

    // 3. 역할 부여 및 필터링 (CLIENT, POTENTIAL만 포함)
    const allRows = scores ?? [];
    const rows = allRows
      .map((r) => {
        const norm = normalizeName(r.company_name);
        const info = roleMap.get(norm);
        return { ...r, company_role: info?.role || "GENERAL" };
      })
      .filter((r) => r.company_role === "CLIENT" || r.company_role === "POTENTIAL");

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
      const actionList = Array.isArray(raw) ? raw : Array.isArray(raw?.actions) ? raw.actions : [];
      const firstAction = actionList[0];

      return {
        id: `${row.company_name}-${idx}`,
        company_name: row.company_name,
        title: firstAction?.title || "전략 추천 생성",
        subtitle: firstAction?.expected_impact || row.trigger_type || "분석 결과 기반 권장 액션",
        updated_at: row.updated_at,
        confidence_score: row.confidence_score ?? 0,
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
        totalCompanies, // 점수가 있는 활성 기업 총합 (CLIENT + POTENTIAL)
        totalManagedCount: managedCount, // 실제 managed_clients 테이블 등록 수
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