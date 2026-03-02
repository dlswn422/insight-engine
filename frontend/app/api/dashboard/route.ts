import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("v_main_dashboard")
    .select("*")
    .or("risk_level.eq.HIGH,opportunity_level.eq.HIGH")
    .order("risk_score", { ascending: false });

  if (error) {
    return Response.json({ error }, { status: 500 });
  }

  return Response.json(data);
}