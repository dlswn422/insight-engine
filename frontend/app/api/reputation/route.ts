/**
 * Reputation API
 *
 * 주의:
 * - 현재 scoreCards는 기존 프론트 호환을 위해 임시 유지되는 필드입니다.
 * - 새 화면은 summaryCards + sentimentTrend + mediaCategory + keywordCloud + topIssues를
 *   중심으로 사용하는 방향을 권장합니다.
 * - sentimentTrend는 synthetic 스케일값이 아니라 최근 12개월 실제 건수 집계입니다.
 */

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type SignalRow = {
  company_name?: string | null;
  event_type?: string | null;
  impact_type?: string | null;
  impact_strength?: number | null;
  severity_level?: number | null;
  signal_category?: string | null;
  created_at?: string | null;
};

type ScoreRow = {
  company_name?: string | null;
  risk_score?: number | null;
  opportunity_score?: number | null;
};

type KeywordTone = "positive" | "negative" | "neutral";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function monthLabel(date: Date) {
  return `${date.getMonth() + 1}월`;
}

function decideKeywordTone(
  positiveCount: number,
  negativeCount: number
): KeywordTone {
  if (positiveCount > negativeCount) return "positive";
  if (negativeCount > positiveCount) return "negative";
  return "neutral";
}

function getMonthBuckets(monthCount: number) {
  const now = new Date();

  return Array.from({ length: monthCount }).map((_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (monthCount - 1 - idx), 1);

    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: monthLabel(d),
      positive: 0,
      negative: 0,
      neutral: 0,
    };
  });
}

function monthKeyFromDate(value?: string | null) {
  if (!value) return null;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function fetchAllSignalsSince(startIso: string): Promise<SignalRow[]> {
  const pageSize = 1000;
  let from = 0;
  const allRows: SignalRow[] = [];

  while (true) {
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("signals")
      .select(`
        company_name,
        event_type,
        impact_type,
        impact_strength,
        severity_level,
        signal_category,
        created_at
      `)
      .gte("created_at", startIso)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    const batch = (data ?? []) as SignalRow[];
    allRows.push(...batch);

    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return allRows;
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
        opportunity_score
      `)
      .range(from, to);

    if (error) throw error;

    const batch = (data ?? []) as ScoreRow[];
    allRows.push(...batch);

    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return allRows;
}

export async function GET() {
  try {
    const monthBuckets = getMonthBuckets(12);
    const oldestMonth = monthBuckets[0];
    const oldestMonthDate = new Date(
      Number(oldestMonth.key.slice(0, 4)),
      Number(oldestMonth.key.slice(5, 7)) - 1,
      1
    ).toISOString();

    const [signalRows, scoreRows] = await Promise.all([
      fetchAllSignalsSince(oldestMonthDate),
      fetchAllScoreRows(),
    ]);

    const totalSignals = signalRows.length;
    const positiveSignals = signalRows.filter((s) => s.impact_type === "opportunity");
    const negativeSignals = signalRows.filter((s) => s.impact_type === "risk");


    const classifiedSignalCount = positiveSignals.length + negativeSignals.length;

    const positiveSignalRatio =
      classifiedSignalCount > 0
        ? Math.round((positiveSignals.length / classifiedSignalCount) * 100)
        : 0;

    const negativeSignalRatio =
      classifiedSignalCount > 0
        ? Math.round((negativeSignals.length / classifiedSignalCount) * 100)
        : 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recent30dSignals = signalRows.filter((row) => {
      if (!row.created_at) return false;
      const d = new Date(row.created_at);
      return !Number.isNaN(d.getTime()) && d >= thirtyDaysAgo;
    });

    const recent30dSignalCount = recent30dSignals.length;

    const avgRisk =
      scoreRows.length > 0
        ? scoreRows.reduce((acc, cur) => acc + Number(cur.risk_score ?? 0), 0) / scoreRows.length
        : 0;

    const avgOpp =
      scoreRows.length > 0
        ? scoreRows.reduce((acc, cur) => acc + Number(cur.opportunity_score ?? 0), 0) / scoreRows.length
        : 0;

    /**
     * 기존 프론트 호환용 scoreCards
     * - 화면이 아직 old label을 쓰고 있을 수 있어 임시 유지
     * - 다음 단계에서 ReputationSection.tsx를 수정하면서 summaryCards로 전환 권장
     */
    const mediaScore = clamp(positiveSignalRatio, 0, 100);
    const financeScore = clamp(Math.round(75 - avgRisk * 0.35 + avgOpp * 0.2), 20, 95);
    const internalScore = clamp(Math.round(70 - avgRisk * 0.2 + avgOpp * 0.15), 20, 95);
    const totalReputation = clamp(
      Math.round(mediaScore * 0.4 + financeScore * 0.3 + internalScore * 0.3),
      20,
      95
    );

    const monthIndexMap = new Map<string, number>();
    monthBuckets.forEach((bucket, index) => {
      monthIndexMap.set(bucket.key, index);
    });

    for (const row of signalRows) {
      const key = monthKeyFromDate(row.created_at);
      if (!key) continue;

      const index = monthIndexMap.get(key);
      if (index === undefined) continue;

      if (row.impact_type === "opportunity") {
        monthBuckets[index].positive += 1;
      } else if (row.impact_type === "risk") {
        monthBuckets[index].negative += 1;
      } else {
        monthBuckets[index].neutral += 1;
      }
    }

    /**
     * sentimentTrend:
     * - synthetic 스케일링 제거
     * - 최근 12개월 실제 건수 집계
     */
    const sentimentTrend = {
      labels: monthBuckets.map((b) => b.label),
      positive: monthBuckets.map((b) => b.positive),
      negative: monthBuckets.map((b) => b.negative),
      neutral: monthBuckets.map((b) => b.neutral),
    };

    const categoryMap = new Map<string, number>();
    for (const row of signalRows) {
      const key = row.signal_category || "기타";
      categoryMap.set(key, (categoryMap.get(key) ?? 0) + 1);
    }

    const mediaCategory = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));

    const keywordMap = new Map<
      string,
      {
        count: number;
        positiveCount: number;
        negativeCount: number;
      }
    >();

    for (const row of signalRows) {
      const key = row.event_type || "기타";

      const prev = keywordMap.get(key) ?? {
        count: 0,
        positiveCount: 0,
        negativeCount: 0,
      };

      prev.count += 1;

      if (row.impact_type === "opportunity") {
        prev.positiveCount += 1;
      } else if (row.impact_type === "risk") {
        prev.negativeCount += 1;
      }

      keywordMap.set(key, prev);
    }

    const keywordCloud = Array.from(keywordMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 12)
      .map(([text, info], idx) => ({
        text,
        count: info.count,
        weight: clamp(36 - idx * 2, 14, 36),
        tone: decideKeywordTone(info.positiveCount, info.negativeCount),
      }));

    const issueMap = new Map<
      string,
      { count: number; severitySum: number; signal_category: string }
    >();

    for (const row of signalRows) {
      const key = row.event_type || "기타 이슈";

      const prev = issueMap.get(key) ?? {
        count: 0,
        severitySum: 0,
        signal_category: row.signal_category || "기타",
      };

      prev.count += 1;
      prev.severitySum += Number(row.severity_level ?? 1);

      issueMap.set(key, prev);
    }

    const topIssues = Array.from(issueMap.entries())
      .map(([title, info]) => ({
        title,
        category: info.signal_category,
        score: Number((info.severitySum + info.count * 1.7).toFixed(1)),
        tone: info.severitySum / info.count >= 3 ? "negative" : "positive",
        mentions: info.count,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return NextResponse.json({
      /**
       * 새 화면용 집계 카드
       * - 실제 집계 중심
       * - 다음 단계 ReputationSection.tsx 수정 시 이쪽 사용 권장
       */
      summaryCards: {
        positiveSignalRatio,
        negativeSignalRatio,
        totalSignals,
        recent30dSignals: recent30dSignalCount,
      },

      /**
       * 기존 화면 호환용
       * - 임시 유지
       */
      scoreCards: {
        mediaScore,
        financeScore,
        internalScore,
        totalReputation,
      },

      sentimentTrend,
      mediaCategory,
      keywordCloud,
      topIssues,
      meta: {
        summaryCards: "aggregated",
        scoreCards: "legacy_heuristic_compatibility",
        sentimentTrend: "aggregated",
        mediaCategory: "aggregated",
        keywordCloud: "aggregated+ui_weight",
        topIssues: "aggregated+ranking",
      },
    });
  } catch (e) {
    console.error("[/api/reputation] unexpected error:", e);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}