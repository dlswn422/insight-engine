import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: Request,
  { params }: { params: { company: string } }
) {
  const company = decodeURIComponent(params.company);

  // 1️⃣ 점수 조회
  const { data: dashboard } = await supabase
    .from("v_main_dashboard")
    .select("*")
    .eq("company_name", company)
    .single();

  // 2️⃣ 최근 이벤트
  const { data: events } = await supabase
    .from("signals")
    .select("event_type, impact_type, impact_strength, created_at")
    .eq("company_name", company)
    .order("created_at", { ascending: false })
    .limit(10);

  // 3️⃣ 전략 조회
  const { data: strategy } = await supabase
    .from("action_recommendations")
    .select("*")
    .eq("company_name", company)
    .single();

  return Response.json({
    dashboard,
    events,
    strategy
  });
}