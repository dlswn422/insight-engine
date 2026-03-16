/**
 * Reputation API
 *
 * 주의:
 * - 본 API의 scoreCards는 재무 원천 테이블을 직접 집계한 확정 점수가 아니라,
 *   signals + company_scores를 기반으로 만든 운영 참고용 heuristic 지표다.
 * - mediaScore / financeScore / internalScore / totalReputation은
 *   화면용 종합 인덱스이며, 절대적 평가값이 아니라 상대 비교용이다.
 * - 향후 실제 재무 원천 데이터, 평판 원천 데이터가 연결되면 교체 대상이다.
 */

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function monthLabel(date: Date) {
  return `${date.getMonth() + 1}월`;
}

type KeywordTone = "positive" | "negative" | "neutral";

function decideKeywordTone(
  positiveCount: number,
  negativeCount: number
): KeywordTone {
  if (positiveCount > negativeCount) return "positive";
  if (negativeCount > positiveCount) return "negative";
  return "neutral";
}

export async function GET() {
  try {
    const { data: signals, error: signalError } = await supabase
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
      .order("created_at", { ascending: false })
      .limit(500);

    const { data: scores } = await supabase
      .from("company_scores")
      .select(`
        company_name,
        risk_score,
        opportunity_score
      `)
      .limit(100);

    if (signalError) {
      console.error("[/api/reputation] signals error:", signalError);
      return NextResponse.json(
        { error: "Failed to fetch signals" },
        { status: 500 }
      );
    }

    const signalRows = signals ?? [];
    const scoreRows = scores ?? [];

    const totalSignals = signalRows.length || 1;
    const positiveSignals = signalRows.filter(
      (s) => s.impact_type === "opportunity"
    );
    const negativeSignals = signalRows.filter(
      (s) => s.impact_type === "risk"
    );

    const avgRisk =
      scoreRows.length > 0
        ? scoreRows.reduce(
            (acc, cur) => acc + Number(cur.risk_score ?? 0),
            0
          ) / scoreRows.length
        : 0;

    const avgOpp =
      scoreRows.length > 0
        ? scoreRows.reduce(
            (acc, cur) => acc + Number(cur.opportunity_score ?? 0),
            0
          ) / scoreRows.length
        : 0;
    // mediaScore:
    // 최근 signals 중 opportunity 비중을 기반으로 만든 미디어 평판 heuristic.
    // 실제 기사 감성 분석의 정밀 결과가 아니라, impact_type 분포 기반의 간이 지표다.
    const mediaScore = clamp(
      Math.round((positiveSignals.length / totalSignals) * 100 * 1.2),
      20,
      95
    );
    
    // financeScore:
    // company_scores의 평균 risk/opportunity를 사용한 재무 건전성 heuristic.
    // 실제 재무제표 원천값(매출, 영업이익, 부채비율 등)을 직접 계산한 값이 아니다.
    const financeScore = clamp(
      Math.round(75 - avgRisk * 0.35 + avgOpp * 0.2),
      20,
      95
    );

    // internalScore:
    // risk/opportunity 평균을 약하게 반영한 내부 평판 heuristic.
    // 운영 화면용 참고 지표이며, 별도 내부 VOC/CS 원천이 연결되면 교체 가능하다.
    const internalScore = clamp(
      Math.round(70 - avgRisk * 0.2 + avgOpp * 0.15),
      20,
      95
    );

    // totalReputation:
    // media/finance/internal score를 가중합한 종합 인덱스.
    // 화면 비교용 composite score이며, 확정 진단 점수로 해석하면 안 된다.
    const totalReputation = clamp(
      Math.round(mediaScore * 0.4 + financeScore * 0.3 + internalScore * 0.3),
      20,
      95
    );

    const now = new Date();
    const monthBuckets = Array.from({ length: 12 }).map((_, idx) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - idx), 1);
      return {
        key: `${d.getFullYear()}-${d.getMonth() + 1}`,
        label: monthLabel(d),
        positive: 0,
        negative: 0,
        neutral: 0,
      };
    });

    for (const row of signalRows) {
      if (!row.created_at) continue;
      const d = new Date(row.created_at);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const bucket = monthBuckets.find((b) => b.key === key);
      if (!bucket) continue;

      if (row.impact_type === "opportunity") bucket.positive += 1;
      else if (row.impact_type === "risk") bucket.negative += 1;
      else bucket.neutral += 1;
    }

    const maxMonth =
      Math.max(
        ...monthBuckets.map((b) => b.positive + b.negative + b.neutral),
        1
      ) || 1;

    // sentimentTrend:
    // 최근 signals를 월 단위로 버킷화한 뒤 화면용 비율 스케일로 변환한 synthetic 시계열.
    // 실제 저장된 월별 평판 지수 시계열 원본이 아니라 대시보드 시각화를 위한 파생값이다.
    const sentimentTrend = {
      labels: monthBuckets.map((b) => b.label),
      positive: monthBuckets.map((b) =>
        Math.round((b.positive / maxMonth) * 80 + 10)
      ),
      negative: monthBuckets.map((b) =>
        Math.round((b.negative / maxMonth) * 25 + 5)
      ),
      neutral: monthBuckets.map((b) =>
        Math.round((b.neutral / maxMonth) * 18 + 8)
      ),
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
    // keywordCloud:
    // signals.event_type 빈도와 impact_type 분포를 기반으로 만든 워드클라우드.
    // tone은 키워드별 risk/opportunity 출현 비율 기준의 단순 규칙값이다.
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
        scoreCards: "heuristic",
        sentimentTrend: "synthetic",
        mediaCategory: "aggregated",
        keywordCloud: "heuristic",
        topIssues: "heuristic",
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