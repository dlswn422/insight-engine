export default function IssueTopList() {
  return (
    <div className="chart-card flex-1">
      <div className="chart-header">
        <h3>
          <i className="fas fa-exclamation-circle"></i> 주요 이슈 TOP 5
        </h3>
      </div>

      <div className="issue-list" id="issueList">
        <div className="issue-item issue-positive">
          <div className="issue-rank">1</div>
          <div className="issue-body">
            <div className="issue-title">GMP 국제 인증 획득</div>
            <div className="issue-meta">
              <span className="tag pos">긍정</span> 미디어 38건 · 2024.05.01
            </div>
          </div>
          <div className="issue-score">+12.4</div>
        </div>

        <div className="issue-item issue-positive">
          <div className="issue-rank">2</div>
          <div className="issue-body">
            <div className="issue-title">수출 계약 400억 달성</div>
            <div className="issue-meta">
              <span className="tag pos">긍정</span> 미디어 22건 · 2024.04.18
            </div>
          </div>
          <div className="issue-score">+8.7</div>
        </div>

        <div className="issue-item issue-positive">
          <div className="issue-rank">3</div>
          <div className="issue-body">
            <div className="issue-title">친환경 앰플 라인 도입</div>
            <div className="issue-meta">
              <span className="tag pos">긍정</span> 미디어 17건 · 2024.03.22
            </div>
          </div>
          <div className="issue-score">+5.2</div>
        </div>

        <div className="issue-item issue-negative">
          <div className="issue-rank">4</div>
          <div className="issue-body">
            <div className="issue-title">납기 지연 민원 접수</div>
            <div className="issue-meta">
              <span className="tag neg">부정</span> 내부 클레임 3건 · 2024.04.29
            </div>
          </div>
          <div className="issue-score">-3.8</div>
        </div>

        <div className="issue-item issue-negative">
          <div className="issue-rank">5</div>
          <div className="issue-body">
            <div className="issue-title">원자재 수급 불안 우려</div>
            <div className="issue-meta">
              <span className="tag neg">부정</span> 뉴스 8건 · 2024.05.10
            </div>
          </div>
          <div className="issue-score">-2.1</div>
        </div>
      </div>
    </div>
  );
}