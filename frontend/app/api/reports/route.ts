import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("daily_opportunity_reports")
      .select("report_date, summary")
      .order("report_date", { ascending: false })
      .limit(30)

    if (error) {
      console.error("[/api/reports] supabase error:", error)
      return NextResponse.json(
        { error: "Failed to fetch reports" },
        { status: 500 }
      )
    }

    return NextResponse.json(data ?? [])
  } catch (e) {
    console.error("[/api/reports] unexpected error:", e)
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    )
  }
}