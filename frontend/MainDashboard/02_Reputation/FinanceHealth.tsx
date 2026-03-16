export default function FinanceHealth() {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>
          <i className="fas fa-won-sign"></i> 재무 건전성 지표 (DART 공시 기반)
        </h3>
      </div>

      <div className="finance-grid">
        <div className="finance-item">
          <div className="fi-label">매출액</div>
          <div className="fi-value">1,284억 원</div>
          <div className="fi-change positive">+7.3% YoY</div>
          <div className="fi-bar">
            <div className="fi-bar-fill" style={{ width: "78%" }}></div>
          </div>
        </div>

        <div className="finance-item">
          <div className="fi-label">영업이익률</div>
          <div className="fi-value">8.4%</div>
          <div className="fi-change positive">+1.2%p</div>
          <div className="fi-bar">
            <div className="fi-bar-fill" style={{ width: "60%" }}></div>
          </div>
        </div>

        <div className="finance-item">
          <div className="fi-label">부채비율</div>
          <div className="fi-value">142%</div>
          <div className="fi-change negative">+12%p</div>
          <div className="fi-bar warning">
            <div className="fi-bar-fill warning" style={{ width: "55%" }}></div>
          </div>
        </div>

        <div className="finance-item">
          <div className="fi-label">유동비율</div>
          <div className="fi-value">183%</div>
          <div className="fi-change positive">+18%p</div>
          <div className="fi-bar">
            <div className="fi-bar-fill" style={{ width: "73%" }}></div>
          </div>
        </div>

        <div className="finance-item">
          <div className="fi-label">수출 비중</div>
          <div className="fi-value">31.4%</div>
          <div className="fi-change positive">+5.2%p</div>
          <div className="fi-bar">
            <div className="fi-bar-fill" style={{ width: "31%" }}></div>
          </div>
        </div>

        <div className="finance-item">
          <div className="fi-label">R&D 투자비</div>
          <div className="fi-value">62억 원</div>
          <div className="fi-change positive">+22% YoY</div>
          <div className="fi-bar">
            <div className="fi-bar-fill" style={{ width: "45%" }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}