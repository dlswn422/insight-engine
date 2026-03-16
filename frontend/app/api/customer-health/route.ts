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

type SignalRow = {
  company_name: string;
  event_type?: string | null;
  impact_type?: string | null;
  signal_category?: string | null;
  created_at?: string | null;
  severity_level?: number | null;
  impact_strength?: number | null;
  trend_bucket?: string | null;
};

type HealthStatus = "danger" | "warning" | "healthy";

type FactorScores = {
  order_drop: number;
  contact_gap: number;
  competitor_touch: number;
  claim_issue: number;
  bid_miss: number;
  owner_change: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

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

function isNonEmptyString(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeText(value?: string | null) {
  return (value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(normalizeText(keyword)));
}

function recencyWeight(createdAt?: string | null) {
  if (!createdAt) return 0.9;

  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return 0.9;

  const diffDays = Math.max(
    0,
    Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
  );

  if (diffDays <= 7) return 1.25;
  if (diffDays <= 30) return 1.1;
  if (diffDays <= 90) return 0.95;
  return 0.8;
}

function impactDirectionWeight(impactType?: string | null) {
  if (impactType === "risk") return 1.0;
  if (impactType === "opportunity") return 0.35;
  return 0.6;
}

function trendBucketWeight(trendBucket?: string | null) {
  const text = normalizeText(trendBucket);

  if (
    includesAny(text, [
      "하락",
      "악화",
      "감소",
      "down",
      "decline",
      "negative",
      "worsening",
    ])
  ) {
    return 1.15;
  }

  if (
    includesAny(text, [
      "상승",
      "개선",
      "증가",
      "up",
      "growth",
      "positive",
      "improving",
    ])
  ) {
    return 0.9;
  }

  return 1.0;
}

function signalPower(row: SignalRow) {
  const severity = clamp(Number(row.severity_level ?? 1), 1, 5);
  const impactStrength = clamp(Number(row.impact_strength ?? 40), 0, 100);

  const severityNorm = severity / 5; // 0.2 ~ 1
  const impactNorm = impactStrength / 100; // 0 ~ 1

  // 기본 0.6 ~ 최대 2.6 정도
  return 0.6 + severityNorm * 0.9 + impactNorm * 1.1;
}

function classifyFactorWeights(row: SignalRow): FactorScores {
  const eventText = normalizeText(row.event_type);
  const categoryText = normalizeText(row.signal_category);
  const trendText = normalizeText(row.trend_bucket);

  const weights: FactorScores = {
    order_drop: 0,
    contact_gap: 0,
    competitor_touch: 0,
    claim_issue: 0,
    bid_miss: 0,
    owner_change: 0,
  };

  // 1) event_type 직접 매핑
  if (
    includesAny(eventText, [
      "발주 감소",
      "수요 감소",
      "매출 감소",
      "주문 감소",
      "출하 감소",
      "수주 감소",
      "order decline",
      "sales drop",
      "demand slowdown",
    ])
  ) {
    weights.order_drop += 1.5;
  }

  if (
    includesAny(eventText, [
      "소통 단절",
      "응답 지연",
      "연락 두절",
      "협의 중단",
      "미응답",
      "커뮤니케이션 이슈",
      "response delay",
      "no response",
    ])
  ) {
    weights.contact_gap += 1.4;
  }

  if (
    includesAny(eventText, [
      "경쟁",
      "경쟁사",
      "시장 점유",
      "대체 공급",
      "파트너 이동",
      "경쟁 제품",
      "competitor",
      "share loss",
      "switch",
    ])
  ) {
    weights.competitor_touch += 1.35;
  }

  if (
    includesAny(eventText, [
      "클레임",
      "불만",
      "품질",
      "리콜",
      "하자",
      "민원",
      "complaint",
      "quality issue",
      "recall",
    ])
  ) {
    weights.claim_issue += 1.45;
  }

  if (
    includesAny(eventText, [
      "입찰 불참",
      "입찰",
      "제안 미응답",
      "선정 실패",
      "수주 실패",
      "bid",
      "proposal",
      "rfp",
    ])
  ) {
    weights.bid_miss += 1.35;
  }

  if (
    includesAny(eventText, [
      "담당자 교체",
      "조직 개편",
      "인사",
      "대표 변경",
      "책임자 변경",
      "owner change",
      "reorg",
      "personnel",
    ])
  ) {
    weights.owner_change += 1.35;
  }

  // 2) signal_category 보정
  if (includesAny(categoryText, ["risk"])) {
    weights.claim_issue += 0.35;
    weights.contact_gap += 0.2;
    weights.order_drop += 0.2;
  }

  if (includesAny(categoryText, ["partnership"])) {
    weights.competitor_touch += 0.45;
    weights.bid_miss += 0.3;
  }

  if (includesAny(categoryText, ["product"])) {
    weights.claim_issue += 0.35;
  }

  if (includesAny(categoryText, ["investment", "expansion"])) {
    weights.competitor_touch += 0.2;
    weights.order_drop += 0.15;
  }

  // 3) trend_bucket 보정
  if (
    includesAny(trendText, [
      "하락",
      "악화",
      "감소",
      "down",
      "decline",
      "negative",
    ])
  ) {
    weights.order_drop += 0.4;
    weights.contact_gap += 0.2;
  }

  if (
    includesAny(trendText, [
      "상승",
      "증가",
      "growth",
      "up",
      "positive",
    ])
  ) {
    weights.competitor_touch += 0.1;
  }

  return weights;
}

function finalizeFactorScore(raw: number) {
  // raw 누적값을 0~5 범위로 완만하게 압축
  return clamp(Math.round((raw / 1.6) * 10) / 10, 0, 5);
}

function factorScoresFromSignals(rows: SignalRow[]): FactorScores {
  const rawTotals: Record<keyof FactorScores, number> = {
    order_drop: 0,
    contact_gap: 0,
    competitor_touch: 0,
    claim_issue: 0,
    bid_miss: 0,
    owner_change: 0,
  };

  for (const row of rows) {
    const factorWeights = classifyFactorWeights(row);
    const power = signalPower(row);
    const direction = impactDirectionWeight(row.impact_type);
    const recency = recencyWeight(row.created_at);
    const trend = trendBucketWeight(row.trend_bucket);

    const overallWeight = power * direction * recency * trend;

    (Object.keys(rawTotals) as Array<keyof FactorScores>).forEach((key) => {
      rawTotals[key] += factorWeights[key] * overallWeight;
    });
  }

  return {
    order_drop: finalizeFactorScore(rawTotals.order_drop),
    contact_gap: finalizeFactorScore(rawTotals.contact_gap),
    competitor_touch: finalizeFactorScore(rawTotals.competitor_touch),
    claim_issue: finalizeFactorScore(rawTotals.claim_issue),
    bid_miss: finalizeFactorScore(rawTotals.bid_miss),
    owner_change: finalizeFactorScore(rawTotals.owner_change),
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
          factors: "heuristic_weighted",
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
        created_at,
        severity_level,
        impact_strength,
        trend_bucket
      `)
      .in("company_name", companies)
      .order("created_at", { ascending: false });

    const signalMap = new Map<string, SignalRow[]>();
    for (const row of signalRows ?? []) {
      const arr = signalMap.get(row.company_name) ?? [];
      arr.push(row);
      signalMap.set(row.company_name, arr);
    }

    const items = (scoreRows ?? []).map((row) => {
      const company = row.company_name;
      const riskScore = Number(row.risk_score ?? 0);
      const oppScore = Number(row.opportunity_score ?? 0);

      const healthScore = toHealthScore(riskScore, oppScore);
      const churnRisk = toChurnRisk(riskScore);
      const status = toStatus(healthScore);

      const companySignals = signalMap.get(company) ?? [];
      const recentSignals = companySignals.slice(0, 5);
      const factorSignals = companySignals.slice(0, 12);

      const signalTags = recentSignals
        .map((s) => s.event_type)
        .filter(isNonEmptyString);

      const factors = factorScoresFromSignals(factorSignals);

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
        factors: "heuristic_weighted",
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