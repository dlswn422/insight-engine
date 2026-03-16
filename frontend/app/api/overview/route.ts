import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type ScoreRow = {
  company_name: string;
  risk_score?: number | null;
  opportunity_score?: number | null;
  risk_level?: string | null;
  opportunity_level?: string | null;
  updated_at?: string | null;
};

type ActionSuggestion = {
  title?: string | null;
  expected_impact?: string | null;
};

type ActionPayload =
  | ActionSuggestion[]
  | { actions?: ActionSuggestion[] }
  | null;

type ActionRow = {
  company_name: string;
  strategy_type?: string | null;
  trigger_type?: string | null;
  confidence_score?: number | null;
  updated_at?: string | null;
  actions?: ActionPayload;
};

type SignalRow = {
  created_at?: string | null;
  impact_type?: string | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function computeCompositeIndex(avgRisk: number, avgOpp: number) {
  return clamp(Math.round(100 - avgRisk * 0.55 + avgOpp * 0.35), 0, 100);
}

function normalizeActionList(payload: ActionPayload | undefined): ActionSuggestion[] {
  if (Array.isArray(payload)) return payload;

  if (
    payload &&
    typeof payload === "object" &&
    "actions" in payload &&
    Array.isArray(payload.actions)
  ) {
    return payload.actions;
  }

  return [];
}

function getLastMonthBuckets(monthCount: number) {
  const now = new Date();
  const buckets: Array<{ key: string; label: string }> = [];

  for (let i = monthCount - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;

    buckets.push({
      key: `${year}-${String(month).padStart(2, "0")}`,
      label: `${month}월`,
    });
  }

  return buckets;
}

function monthKeyFromDate(value?: string | null) {
  if (!value) return null;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function fetchAllScoreRows(): Promise<ScoreRow[]> {
  const pageSize = 1000;
  let from = 0;
  const allRows: ScoreRow[] = [];

  while (true) {
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("company_scores")
      .select(`
        company_name,
        risk_score,
        opportunity_score,
        risk_level,
        opportunity_level,
        updated_at
      `)
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw error;
    }

    const batch = (data ?? []) as ScoreRow[];
    allRows.push(...batch);

    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return allRows;
}

async function fetchAllSignalRowsSince(startIso: string): Promise<SignalRow[]> {
  const pageSize = 1000;
  let from = 0;
  const allRows: SignalRow[] = [];

  while (true) {
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("signals")
      .select(`
        created_at,
        impact_type
      `)
      .gte("created_at", startIso)
      .order("created_at", { ascending: true })
      .range(from, to);

    if (error) {
      throw error;
    }

    const batch = (data ?? []) as SignalRow[];
    allRows.push(...batch);

    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return allRows;
}

export async function GET() {
  try {
    const rows = await fetchAllScoreRows();
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
        const value = Number(r.risk_score ?? 0);
        return value >= 40 && value < 70;
      }).length,
      danger: rows.filter((r) => Number(r.risk_score ?? 0) >= 70).length,
    };

    const { data: actionData } = await supabase
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

    const actionRows: ActionRow[] = (actionData ?? []) as ActionRow[];

    const alerts = actionRows.map((row, idx) => {
      const actionList = normalizeActionList(row.actions);
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
        buttonLabel = "기회보기";
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
        confidence_score: Number(row.confidence_score ?? 0),
        actionType,
        buttonLabel,
      };
    });

    const monthBuckets = getLastMonthBuckets(6);
    const trend = {
      labels: monthBuckets.map((bucket) => bucket.label),
      risk: Array.from({ length: monthBuckets.length }, () => 0),
      opportunity: Array.from({ length: monthBuckets.length }, () => 0),
      neutral: Array.from({ length: monthBuckets.length }, () => 0),
    };

    const oldestMonth = monthBuckets[0];
    const oldestMonthDate = new Date(
      Number(oldestMonth.key.slice(0, 4)),
      Number(oldestMonth.key.slice(5, 7)) - 1,
      1
    ).toISOString();

    const signalRows = await fetchAllSignalRowsSince(oldestMonthDate);

    const monthIndexMap = new Map<string, number>();
    monthBuckets.forEach((bucket, index) => {
      monthIndexMap.set(bucket.key, index);
    });

    for (const row of signalRows) {
      const key = monthKeyFromDate(row.created_at);
      if (!key) continue;

      const index = monthIndexMap.get(key);
      if (index === undefined) continue;

      if (row.impact_type === "risk") {
        trend.risk[index] += 1;
      } else if (row.impact_type === "opportunity") {
        trend.opportunity[index] += 1;
      } else {
        trend.neutral[index] += 1;
      }
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const rceptDtLowerBound = [
      thirtyDaysAgo.getFullYear(),
      String(thirtyDaysAgo.getMonth() + 1).padStart(2, "0"),
      String(thirtyDaysAgo.getDate()).padStart(2, "0"),
    ].join("");

    const { count: dartCount, error: dartError } = await supabase
      .from("dart_disclosures")
      .select("rcept_no", { count: "exact", head: true })
      .gte("rcept_dt", rceptDtLowerBound);

    if (dartError) {
      console.error("[/api/overview] dart_disclosures count error:", dartError);
    }

    return NextResponse.json({
      kpis: {
        compositeIndex,
        riskHighCount,
        riskMedCount,
        oppHighCount,
        totalCompanies,
        dartCount: Number(dartCount ?? 0),
      },
      distribution: healthDistribution,
      alerts,
      trend,
    });
  } catch (e) {
    console.error("[/api/overview] unexpected error:", e);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}