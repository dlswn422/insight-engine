/**
 * 리포트 요약 데이터를 파싱하는 유틸리티
 */

export interface ParsedSummary {
  industry_summary: string;
  top_opportunities: any[];
  top_risks: any[];
  top_trends: any[];
  risk_watchlist: any[];
  opportunity_watchlist: any[];
  overall_strategy?: string;
}

export function parseReportSummary(summary: any): ParsedSummary {
  if (!summary) {
    return {
      industry_summary: "분석된 리포트 내용이 없습니다.",
      top_opportunities: [],
      top_risks: [],
      top_trends: [],
      risk_watchlist: [],
      opportunity_watchlist: [],
      overall_strategy: "",
    };
  }

  // 데이터가 이미 객체인 경우
  let parsed: any;
  if (typeof summary === "object") {
    parsed = summary;
  } else {
    // 문자열인 경우 JSON 파싱 시도
    try {
      parsed = typeof summary === "string" ? JSON.parse(summary) : summary;
    } catch (e) {
      console.error("Failed to parse report summary:", e);
      return {
        industry_summary: String(summary),
        top_opportunities: [],
        top_risks: [],
        top_trends: [],
        risk_watchlist: [],
        opportunity_watchlist: [],
        overall_strategy: "",
      };
    }
  }

  return {
    industry_summary: parsed?.industry_summary || parsed?.summary || "리포트 요약 정보를 불러올 수 없습니다.",
    top_opportunities: Array.isArray(parsed?.top_opportunities) ? parsed.top_opportunities : [],
    top_risks: Array.isArray(parsed?.top_risks) ? parsed.top_risks : [],
    top_trends: Array.isArray(parsed?.top_trends) ? parsed.top_trends : [],
    risk_watchlist: Array.isArray(parsed?.risk_watchlist) ? parsed.risk_watchlist : [],
    opportunity_watchlist: Array.isArray(parsed?.opportunity_watchlist) ? parsed.opportunity_watchlist : [],
    overall_strategy: parsed?.overall_strategy || "",
  };
}
