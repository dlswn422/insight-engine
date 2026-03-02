import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    const { data } = await supabase
      .from("daily_opportunity_reports")
      .select("*")
      .order("report_date", { ascending: false })

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: "Report list fetch failed" }, { status: 500 })
  }
}