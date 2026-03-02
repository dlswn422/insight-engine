async function getReport(date: string) {
  const res = await fetch(
    `http://localhost:3000/api/reports/${date}`,
    { cache: "no-store" }
  )

  if (!res.ok) throw new Error("Failed to fetch report")

  return res.json()
}

export default async function ReportDetailPage({
  params
}: {
  params: { date: string }
}) {
  const report = await getReport(params.date)

  if (!report) return <div>No Report Found</div>

  const parsed = report.summary ? JSON.parse(report.summary) : null

  return (
    <div style={{ padding: 40 }}>
      <h1>📊 Report - {report.report_date}</h1>

      <h2>Industry Summary</h2>
      <p>{parsed?.industry_summary}</p>

      <h2>Rising Trends</h2>
      <p>{parsed?.rising_trends}</p>

      <h2>Risk Analysis</h2>
      <p>{parsed?.risk_analysis}</p>

      <h2>Opportunity Strategy</h2>
      <p>{parsed?.opportunity_strategy}</p>

      <h2>Overall Strategy</h2>
      <p>{parsed?.overall_strategy}</p>
    </div>
  )
}