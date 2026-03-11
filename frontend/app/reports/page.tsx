async function getReports() {
  const res = await fetch("http://localhost:3000/api/reports", {
    cache: "no-store"
  })

  if (!res.ok) throw new Error("Failed to fetch reports")

  return res.json()
}

export default async function ReportsPage() {
  const reports = await getReports()

  return (
    <div style={{ padding: 40 }}>
      <h1>📄 Daily Reports</h1>

      {reports?.map((report: any) => {
        const parsed = report.summary ? JSON.parse(report.summary) : null

        return (
          <div key={report.id} style={{ marginBottom: 20 }}>
            <a href={`/reports/${report.report_date}`}>
              <strong>{report.report_date}</strong>
            </a>
            <div>{parsed?.industry_summary}</div>
          </div>
        )
      })}
    </div>
  )
}