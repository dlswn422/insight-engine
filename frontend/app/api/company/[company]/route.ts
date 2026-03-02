import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ company: string }> }
) {
  try {
    console.log("==== API START ====");

    // 🔥 중요: await params
    const resolvedParams = await params;

    console.log("Resolved params:", resolvedParams);

    const rawCompany = resolvedParams.company;

    console.log("Raw param:", rawCompany);

    const company = decodeURIComponent(rawCompany).trim();

    console.log("Decoded:", company);

    // 최신 전략 조회
    const { data: strategy } = await supabase
      .from("action_recommendations")
      .select("*")
      .eq("company_name", company)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log("Strategy:", strategy);
    console.log("==== API END ====");

    return Response.json({
      strategy
    });
  } catch (err) {
    console.error("🔥 API ERROR:", err);
    return Response.json({ error: "Server Error" }, { status: 500 });
  }
}