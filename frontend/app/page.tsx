async function getDashboardData() {
  const res = await fetch("http://localhost:3000/api/dashboard", {
    cache: "no-store"
  })

  if (!res.ok) throw new Error("Failed to fetch dashboard")

  return res.json()
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <div style={{ padding: 40 }}>
      <h1>📡 Industry Radar Dashboard</h1>

      <h2>🔥 Top Industries</h2>
      {data.industries?.slice(0, 5).map((item: any) => (
        <div key={item.industry_tag}>
          {item.industry_tag} | Impact: {item.total_impact} | Events: {item.event_count}
        </div>
      ))}

      <h2>🚀 Top Opportunities</h2>
      {data.opportunities?.map((item: any) => (
        <div key={item.company_name}>
          {item.company_name} | Score: {item.opportunity_score}
        </div>
      ))}

      <h2>⚠️ Risk Watchlist</h2>
      {data.risks?.map((item: any) => (
        <div key={item.company_name}>
          {item.company_name} | Risk: {item.risk_score}
        </div>
      ))}
    </div>
  )
}