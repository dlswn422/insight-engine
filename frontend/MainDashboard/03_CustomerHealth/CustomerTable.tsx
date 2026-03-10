import { CustomerItem } from "../mockData/customerData";

interface CustomerTableProps {
  customers: CustomerItem[];
}

function getStatusEmoji(status: CustomerItem["status"]) {
  return status === "red" ? "🔴" : status === "yellow" ? "🟡" : "🟢";
}

function getRiskClass(risk: number) {
  if (risk >= 60) return "risk-high";
  if (risk >= 30) return "risk-medium";
  return "risk-low";
}

function getScoreClass(score: number) {
  if (score >= 70) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function getTrendNode(val: number) {
  if (val > 0) {
    return <span className="trend-arrow trend-up">▲ +{val}%</span>;
  }
  if (val < 0) {
    return <span className="trend-arrow trend-down">▼ {val}%</span>;
  }
  return <span className="trend-arrow trend-flat">━ 0%</span>;
}

export default function CustomerTable({ customers }: CustomerTableProps) {
  return (
    <div className="chart-card no-pad">
      <table className="customer-table" id="customerTable">
        <thead>
          <tr>
            <th>상태</th>
            <th>고객사명</th>
            <th>업종</th>
            <th>건강도 점수</th>
            <th>이탈 위험도</th>
            <th>발주 추이</th>
            <th>주요 신호</th>
            <th>최근 접촉</th>
            <th>상세</th>
          </tr>
        </thead>

        <tbody id="customerTableBody">
          {customers.map((customer) => {
            const scoreClass = getScoreClass(customer.healthScore);
            const riskClass = getRiskClass(customer.riskPct);

            return (
              <tr key={customer.id}>
                <td>{getStatusEmoji(customer.status)}</td>

                <td>
                  <div className="customer-name">{customer.name}</div>
                  <div className="customer-type">{customer.revenue}</div>
                </td>

                <td>
                  <span className="customer-type">{customer.type}</span>
                </td>

                <td>
                  <div className="score-bar-wrap">
                    <div className="score-bar">
                      <div
                        className={`score-bar-fill ${scoreClass}`}
                        style={{ width: `${customer.healthScore}%` }}
                      ></div>
                    </div>

                    <span
                      className="score-num"
                      style={{
                        color:
                          scoreClass === "high"
                            ? "#4ade80"
                            : scoreClass === "medium"
                            ? "#fcd34d"
                            : "#f87171",
                      }}
                    >
                      {customer.healthScore}
                    </span>
                  </div>
                </td>

                <td>
                  <span className={`risk-badge ${riskClass}`}>
                    {customer.riskPct}%
                  </span>
                </td>

                <td>{getTrendNode(customer.orderTrend)}</td>

                <td>
                  <div className="signal-tags">
                    {customer.signals.map((signal) => (
                      <span key={`${customer.id}-${signal}`} className="signal-tag">
                        {signal}
                      </span>
                    ))}
                  </div>
                </td>

                <td>
                  <span style={{ fontSize: "11px", color: "#8892a4" }}>
                    {customer.lastContact}
                  </span>
                </td>

                <td>
                  <button type="button" className="detail-btn">
                    건강 진단서
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}