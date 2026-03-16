export default function KpiCardsRow() {
  return (
    <div className="kpi-grid">
      <div className="kpi-card kpi-primary">
        <div className="kpi-icon">
          <i className="fas fa-star"></i>
        </div>
        <div className="kpi-content">
          <div className="kpi-label">종합 평판 지수</div>
          <div className="kpi-value">
            78.4<span className="kpi-unit">/100</span>
          </div>
          <div className="kpi-change positive">
            <i className="fas fa-arrow-up"></i> +3.2 (전월 대비)
          </div>
        </div>
        <div className="kpi-ring">
          <svg viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="2.5"
            />
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              stroke="#6366f1"
              strokeWidth="2.5"
              strokeDasharray="78.4 21.6"
              strokeDashoffset="25"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      <div className="kpi-card kpi-danger">
        <div className="kpi-icon">
          <i className="fas fa-exclamation-triangle"></i>
        </div>
        <div className="kpi-content">
          <div className="kpi-label">이탈 위험 고객</div>
          <div className="kpi-value">
            3<span className="kpi-unit">개사</span>
          </div>
          <div className="kpi-change negative">
            <i className="fas fa-arrow-up"></i> +1 (전월 대비)
          </div>
        </div>
        <div className="kpi-badge danger">긴급 관리 필요</div>
      </div>

      <div className="kpi-card kpi-warning">
        <div className="kpi-icon">
          <i className="fas fa-exclamation-circle"></i>
        </div>
        <div className="kpi-content">
          <div className="kpi-label">주의 관찰 고객</div>
          <div className="kpi-value">
            5<span className="kpi-unit">개사</span>
          </div>
          <div className="kpi-change neutral">
            <i className="fas fa-minus"></i> 유지
          </div>
        </div>
        <div className="kpi-badge warning">모니터링 강화</div>
      </div>

      <div className="kpi-card kpi-success">
        <div className="kpi-icon">
          <i className="fas fa-lightbulb"></i>
        </div>
        <div className="kpi-content">
          <div className="kpi-label">신규 기회 건수</div>
          <div className="kpi-value">
            12<span className="kpi-unit">건</span>
          </div>
          <div className="kpi-change positive">
            <i className="fas fa-arrow-up"></i> +4 (이번 주)
          </div>
        </div>
        <div className="kpi-badge success">즉시 영업 가능</div>
      </div>

      <div className="kpi-card kpi-info">
        <div className="kpi-icon">
          <i className="fas fa-industry"></i>
        </div>
        <div className="kpi-content">
          <div className="kpi-label">총 관리 고객사</div>
          <div className="kpi-value">
            47<span className="kpi-unit">개사</span>
          </div>
          <div className="kpi-change positive">
            <i className="fas fa-arrow-up"></i> +2 (신규 등록)
          </div>
        </div>
        <div className="kpi-badge info">제약/화장품</div>
      </div>

      <div className="kpi-card kpi-purple">
        <div className="kpi-icon">
          <i className="fas fa-file-medical"></i>
        </div>
        <div className="kpi-content">
          <div className="kpi-label">DART 공시 모니터링</div>
          <div className="kpi-value">
            28<span className="kpi-unit">건</span>
          </div>
          <div className="kpi-change positive">
            <i className="fas fa-arrow-up"></i> 이번 주 신규
          </div>
        </div>
        <div className="kpi-badge purple">자동 수집 중</div>
      </div>
    </div>
  );
}