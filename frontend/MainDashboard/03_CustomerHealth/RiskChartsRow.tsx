export default function RiskChartsRow() {
  return (
    <div className="charts-row" style={{ marginTop: "20px" }}>
      <div className="chart-card flex-1">
        <div className="chart-header">
          <h3>
            <i className="fas fa-spider"></i> 이탈 위험 고객 요인 분석
          </h3>
        </div>
        <div style={{ height: "280px" }}>
          <canvas id="radarChart"></canvas>
        </div>
      </div>

      <div className="chart-card flex-1">
        <div className="chart-header">
          <h3>
            <i className="fas fa-chart-bar"></i> 발주량 변동 TOP 5 (전월 대비)
          </h3>
        </div>
        <div style={{ height: "280px" }}>
          <canvas id="orderChangeChart"></canvas>
        </div>
      </div>
    </div>
  );
}