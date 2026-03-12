import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

type RouteContext = {
  params: Promise<{
    date: string
  }>
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { date } = await context.params

    const { data, error } = await supabase
      .from("daily_opportunity_reports")
      .select("report_date, summary")
      .eq("report_date", date)
      .maybeSingle()

    if (error) {
      console.error("[/api/reports/[date]] supabase error:", error)
      return NextResponse.json(
        { error: "Failed to fetch report" },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (e) {
    console.error("[/api/reports/[date]] unexpected error:", e)
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    )
  }
}