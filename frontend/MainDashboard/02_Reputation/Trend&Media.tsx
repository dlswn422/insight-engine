import MediaCategoryPanel from "./MediaCategory";

export default function TrendAndMediaRow() {
  return (
    <div className="charts-row">
      <div className="chart-card flex-2">
        <div className="chart-header">
          <h3>
            <i className="fas fa-chart-line"></i> 감성 트렌드 분석 (12개월)
          </h3>
          <div className="chart-tabs">
            <button className="tab-btn active">감성 분석</button>
            <button className="tab-btn">미디어 노출</button>
          </div>
        </div>
        <div style={{ height: "240px" }}>
          <canvas id="sentimentTrendChart"></canvas>
        </div>
      </div>

      <MediaCategoryPanel />
    </div>
  );
}