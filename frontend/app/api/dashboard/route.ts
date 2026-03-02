import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    const { data: industries } = await supabase
      .from("industry_trend_summary")
      .select("*")
      .order("total_impact", { ascending: false })

    const { data: opportunities } = await supabase
      .from("company_signal_summary")
      .select("*")
      .order("opportunity_score", { ascending: false })
      .limit(5)

    const { data: risks } = await supabase
      .from("company_signal_summary")
      .select("*")
      .order("risk_score", { ascending: false })
      .limit(5)

    return NextResponse.json({
      industries,
      opportunities,
      risks
    })
  } catch (error) {
    return NextResponse.json({ error: "Dashboard fetch failed" }, { status: 500 })
  }
}