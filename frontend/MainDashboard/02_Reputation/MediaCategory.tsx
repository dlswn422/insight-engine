export default function MediaCategory() {
  return (
    <div className="chart-card flex-1">
      <div className="chart-header">
        <h3>
          <i className="fas fa-newspaper"></i> 미디어 카테고리
        </h3>
      </div>
      <div style={{ height: "240px" }}>
        <canvas id="mediaCategoryChart"></canvas>
      </div>
    </div>
  );
}