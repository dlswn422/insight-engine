import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(
  request: Request,
  { params }: { params: { date: string } }
) {
  try {
    const { data } = await supabase
      .from("daily_opportunity_reports")
      .select("*")
      .eq("report_date", params.date)
      .single()

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: "Report detail fetch failed" }, { status: 500 })
  }
}