/**
 * Opportunities API
 *
 * 주의:
 * - priority(urgent/high/medium)와 sizeLabel은
 *   최근 signal과 score를 이용한 규칙 기반 영업 기회 분류 결과다.
 * - 실제 수주 금액 예측 모델의 결과가 아니라, 영업 우선순위 및 기회 규모 참고용 heuristic이다.
 * - sourceData는 source 집계 기반 실데이터 분포이고,
 *   sizeData는 product 단위 기회 규모 rank 합산 기반 참고 지표다.
 */

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type StrategyAction = {
  title?: string;
  owner?: string;
  timeline?: string;
  expected_impact?: string;
  evidence?: string[];
};

type StrategyActionsPayload =
  | StrategyAction[]
  | { actions?: StrategyAction[] }
  | null;

type StrategyRow = {
  company_name: string;
  actions?: StrategyActionsPayload;
  updated_at?: string | null;
};

type OpportunitySignalRow = {
  company_name: string;
  event_type?: string | null;
  signal_category?: string | null;
  industry_tag?: string | null;
  trend_bucket?: string | null;
  created_at?: string | null;
  impact_strength?: number | null;
  confidence?: number | null;
};

type OpportunityPriority = "urgent" | "high" | "medium";

type OpportunitySize = {
  label: string;
  rank: number;
};

type OpportunityItem = {
  id: string;
  priority: OpportunityPriority;
  company: string;
  trigger: string;
  desc: string;
  sizeLabel: string;
  sizeRank: number;
  source: string;
  date: string;
  product: string;
  action: string;
};

function decidePriority(score: number): OpportunityPriority {
  if (score >= 85) return "urgent";
  if (score >= 60) return "high";
  return "medium";
}

function estimateOpportunitySize(score: number): OpportunitySize {
  if (score >= 85) {
    return { label: "기회 규모 상", rank: 3 };
  }
  if (score >= 70) {
    return { label: "기회 규모 중", rank: 2 };
  }
  return { label: "기회 규모 검토", rank: 1 };
}

function sourceLabelFromSignal(
  signalCategory?: string | null,
  eventType?: string | null
) {
  const et = eventType || "";
  if (et.includes("공시")) return "DART 공시";
  if (et.includes("허가") || et.includes("승인")) return "식약처 공시";
  if (signalCategory === "Investment") return "투자 뉴스";
  if (signalCategory === "Product") return "신제품 발표";
  if (signalCategory === "Partnership") return "업계 뉴스";
  return "업계 뉴스";
}

function actionLabelFromPriority(priority: OpportunityPriority) {
  if (priority === "urgent") return "이번 주 영업팀 접촉";
  if (priority === "high") return "1주 내 접촉";
  return "추이 관찰 후 접촉";
}

function normalizeStrategyActions(
  payload: StrategyActionsPayload | undefined
): StrategyAction[] {
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

function normalizeProductLabel(value?: string | null) {
  if (!value || !value.trim()) return "기회";
  return value.trim();
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
      .limit(20);

    if (scoreError) {
      console.error("[/api/opportunities] company_scores error:", scoreError);
      return NextResponse.json(
        { error: "Failed to fetch scores" },
        { status: 500 }
      );
    }

    const companies = (scoreRows ?? []).map((row) => row.company_name);

    if (companies.length === 0) {
      return NextResponse.json({
        summary: {
          urgentCount: 0,
          highCount: 0,
          mediumCount: 0,
          totalCount: 0,
          topSizeCount: 0,
        },
        items: [],
        sourceData: { labels: [], values: [] },
        sizeData: { labels: [], values: [] },
      });
    }

    const { data: strategyRows } = await supabase
      .from("action_recommendations")
      .select("company_name, actions, updated_at")
      .in("company_name", companies);

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
      .order("created_at", { ascending: false });

    const strategyMap = new Map<string, StrategyRow>();
    for (const row of strategyRows ?? []) {
      strategyMap.set(row.company_name, row);
    }

    const signalMap = new Map<string, OpportunitySignalRow[]>();
    for (const row of signalRows ?? []) {
      const arr = signalMap.get(row.company_name) ?? [];
      arr.push(row);
      signalMap.set(row.company_name, arr);
    }

    const items: OpportunityItem[] = (scoreRows ?? []).map((row, idx) => {
      const company = row.company_name;
      const score = Number(row.opportunity_score ?? 0);

      const priority = decidePriority(score);
      const topSignal = (signalMap.get(company) ?? [])[0];
      const size = estimateOpportunitySize(score);

      const strategy = strategyMap.get(company);
      const strategyActions = normalizeStrategyActions(strategy?.actions);

      const trigger =
        topSignal?.event_type ||
        strategyActions[0]?.title ||
        "기회 신호 감지";

      const source = sourceLabelFromSignal(
        topSignal?.signal_category,
        topSignal?.event_type
      );

      const desc =
        strategyActions[0]?.expected_impact ||
        `${company}의 최근 기회 점수 ${score.toFixed(1)} 기반으로 영업 기회가 감지되었습니다.`;

      const dateValue = topSignal?.created_at || row.updated_at;
      const date = dateValue
        ? new Date(dateValue).toLocaleDateString("ko-KR")
        : "-";

      return {
        id: `${company}-${idx}`,
        priority,
        company,
        trigger,
        desc,
        sizeLabel: size.label,
        sizeRank: size.rank,
        source,
        date,
        product: normalizeProductLabel(topSignal?.industry_tag),
        action: strategyActions[0]?.title || actionLabelFromPriority(priority),
      };
    });

    const urgentCount = items.filter((i) => i.priority === "urgent").length;
    const highCount = items.filter((i) => i.priority === "high").length;
    const mediumCount = items.filter((i) => i.priority === "medium").length;
    const totalCount = items.length;
    const topSizeCount = items.filter((i) => i.sizeRank === 3).length;

    const sourceCountMap = new Map<string, number>();
    for (const item of items) {
      sourceCountMap.set(item.source, (sourceCountMap.get(item.source) ?? 0) + 1);
    }

    const sourceData = {
      labels: Array.from(sourceCountMap.keys()),
      values: Array.from(sourceCountMap.values()),
    };

    const sizeBucketMap = new Map<string, number>();
    for (const item of items) {
      sizeBucketMap.set(
        item.product,
        (sizeBucketMap.get(item.product) ?? 0) + item.sizeRank
      );
    }

    const sizeDataEntries = Array.from(sizeBucketMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const sizeData = {
      labels: sizeDataEntries.map(([label]) => label),
      values: sizeDataEntries.map(([, value]) => value),
    };

    return NextResponse.json({
      summary: {
        urgentCount,
        highCount,
        mediumCount,
        totalCount,
        topSizeCount,
      },
      items,
      sourceData,
      sizeData,
    });
  } catch (e) {
    console.error("[/api/opportunities] unexpected error:", e);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}