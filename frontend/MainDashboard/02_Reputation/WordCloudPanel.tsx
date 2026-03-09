export default function WordCloudPanel() {
  return (
    <div className="chart-card flex-1">
      <div className="chart-header">
        <h3>
          <i className="fas fa-cloud"></i> 키워드 워드클라우드
        </h3>
        <div className="tab-filter">
          <button className="filter-btn active">긍정</button>
          <button className="filter-btn">부정</button>
          <button className="filter-btn">전체</button>
        </div>
      </div>
      <div className="wordcloud-container" id="wordcloudContainer"></div>
    </div>
  );
}