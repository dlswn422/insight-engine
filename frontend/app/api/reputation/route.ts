import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getCompanyRoles, normalizeName } from "@/lib/company-service";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function monthLabel(date: Date) {
  return `${date.getMonth() + 1}월`;
}

export async function GET() {
  try {
    // 1. 기업 분류 맵 가져오기
    const roleMap = await getCompanyRoles();

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
      .limit(500);

    if (signalError) {
      console.error("[/api/reputation] signals error:", signalError);
      return NextResponse.json(
        { error: "Failed to fetch signals" },
        { status: 500 }
      );
    }

    const signalRows = signals ?? [];
    const allScoreRows = scores ?? [];

    // CLIENT, POTENTIAL 기업만 필터링하여 평균 계산에 포함
    const scoreRows = allScoreRows.filter((r) => {
      const norm = normalizeName(r.company_name);
      const role = roleMap.get(norm)?.role;
      return role === "CLIENT" || role === "POTENTIAL";
    });

    const totalSignals = signalRows.length || 1;
    const positiveSignals = signalRows.filter((s) => s.impact_type === "opportunity");
    const negativeSignals = signalRows.filter((s) => s.impact_type === "risk");

    const avgRisk =
      scoreRows.length > 0
        ? scoreRows.reduce((acc, cur) => acc + Number(cur.risk_score ?? 0), 0) /
          scoreRows.length
        : 0;

    const avgOpp =
      scoreRows.length > 0
        ? scoreRows.reduce((acc, cur) => acc + Number(cur.opportunity_score ?? 0), 0) /
          scoreRows.length
        : 0;

    const mediaScore = clamp(
      Math.round((positiveSignals.length / totalSignals) * 100 * 1.2),
      20,
      95
    );

    const financeScore = clamp(
      Math.round(75 - avgRisk * 0.35 + avgOpp * 0.2),
      20,
      95
    );

    const internalScore = clamp(
      Math.round(70 - avgRisk * 0.2 + avgOpp * 0.15),
      20,
      95
    );

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

    const keywordMap = new Map<string, number>();
    for (const row of signalRows) {
      const key = row.event_type || "기타";
      keywordMap.set(key, (keywordMap.get(key) ?? 0) + 1);
    }

    const keywordCloud = Array.from(keywordMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([text, count], idx) => ({
        text,
        count,
        weight: clamp(36 - idx * 2, 14, 36),
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
    });
  } catch (e) {
    console.error("[/api/reputation] unexpected error:", e);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
