export default function OpportunityChartsRow() {
  return (
    <div className="charts-row" style={{ marginTop: "24px" }}>
      <div className="chart-card flex-1">
        <div className="chart-header">
          <h3>
            <i className="fas fa-database"></i> 기회 발굴 소스
          </h3>
        </div>
        <div style={{ height: "240px" }}>
          <canvas id="oppSourceChart"></canvas>
        </div>
      </div>

      <div className="chart-card flex-2">
        <div className="chart-header">
          <h3>
            <i className="fas fa-chart-bar"></i> 기회 유형별 예상 매출
          </h3>
        </div>
        <div style={{ height: "240px" }}>
          <canvas id="oppRevenueChart"></canvas>
        </div>
      </div>
    </div>
  );
}