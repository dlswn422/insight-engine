import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    const { data, error } = await supabase
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
      .limit(100)

    if (error) {
      console.error("[/api/dashboard] supabase error:", error)
      return NextResponse.json(
        { error: "Failed to fetch dashboard data" },
        { status: 500 }
      )
    }

    return NextResponse.json(data ?? [])
  } catch (e) {
    console.error("[/api/dashboard] unexpected error:", e)
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    )
  }
}