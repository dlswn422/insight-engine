import { opportunityList } from "../mockData/opportunityData";

const colOrder = ["urgent", "high", "medium"] as const;

const colInfo = {
  urgent: { className: "urgent", label: "긴급" },
  high: { className: "high", label: "높음" },
  medium: { className: "medium", label: "보통" },
};

export default function PipelineBoard() {
  const cols = {
    urgent: opportunityList.filter((item) => item.priority === "urgent"),
    high: opportunityList.filter((item) => item.priority === "high"),
    medium: opportunityList.filter((item) => item.priority === "medium"),
  };

  return (
    <>
      <div className="pipeline-header">
        <div className="pipeline-stage-headers">
          <div className="ps-header ps-urgent">🔴 긴급 ({cols.urgent.length})</div>
          <div className="ps-header ps-high">🟡 높음 ({cols.high.length})</div>
          <div className="ps-header ps-medium">🔵 보통 ({cols.medium.length})</div>
        </div>
      </div>

      <div className="pipeline-board" id="pipelineBoard">
        {colOrder.map((priority) => (
          <div key={priority} className="pipeline-col">
            {cols[priority].map((item) => (
              <div
                key={item.id}
                className={`opp-card ${colInfo[priority].className}`}
              >
                <div className="opp-card-header">
                  <div className="opp-company">{item.company}</div>
                  <div className="opp-amount">{item.amount}</div>
                </div>

                <div className="opp-trigger">
                  <i className="fas fa-bolt"></i> {item.trigger}
                </div>

                <div className="opp-desc">{item.desc}</div>

                <div className="opp-footer">
                  <div className="opp-source">
                    <i className="fas fa-database"></i> {item.source}
                  </div>
                  <div className="opp-date">{item.date}</div>
                </div>

                <button type="button" className="opp-action-btn">
                  <i className="fas fa-paper-plane"></i> {item.action}
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}