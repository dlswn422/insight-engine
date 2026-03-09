export default function OpportunitySummary() {
  return (
    <div className="opp-kpi-row">
      <div className="opp-kpi">
        <i className="fas fa-fire opp-icon red"></i>
        <div className="opp-kpi-info">
          <div className="opp-kpi-num">4건</div>
          <div className="opp-kpi-label">긴급 (즉시 접촉)</div>
        </div>
      </div>

      <div className="opp-kpi">
        <i className="fas fa-bolt opp-icon yellow"></i>
        <div className="opp-kpi-info">
          <div className="opp-kpi-num">5건</div>
          <div className="opp-kpi-label">높음 (1주 내 접촉)</div>
        </div>
      </div>

      <div className="opp-kpi">
        <i className="fas fa-clock opp-icon blue"></i>
        <div className="opp-kpi-info">
          <div className="opp-kpi-num">3건</div>
          <div className="opp-kpi-label">보통 (추이 관찰)</div>
        </div>
      </div>

      <div className="opp-kpi">
        <i className="fas fa-won-sign opp-icon green"></i>
        <div className="opp-kpi-info">
          <div className="opp-kpi-num">약 38억</div>
          <div className="opp-kpi-label">예상 연간 매출</div>
        </div>
      </div>
    </div>
  );
}