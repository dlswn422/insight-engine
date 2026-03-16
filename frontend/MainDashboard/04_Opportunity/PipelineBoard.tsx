import type { OpportunityItem } from "./OpportunitySection";

const COL_ORDER = ["urgent", "high", "medium"] as const;

const COL_INFO = {
  urgent: { label: "긴급", className: "urgent" },
  high: { label: "높음", className: "high" },
  medium: { label: "보통", className: "medium" },
};

type Props = {
  items: OpportunityItem[];
};

export default function PipelineBoard({ items }: Props) {
  const grouped = {
    urgent: items.filter((item) => item.priority === "urgent"),
    high: items.filter((item) => item.priority === "high"),
    medium: items.filter((item) => item.priority === "medium"),
  };

  return (
    <div className="opportunity-board-wrap">
      <div className="pipeline-stage-headers">
        {COL_ORDER.map((priority) => (
          <div
            key={priority}
            className={`ps-header ps-${COL_INFO[priority].className}`}
          >
            {COL_INFO[priority].label} ({grouped[priority].length})
          </div>
        ))}
      </div>

      <div className="pipeline-board">
        {COL_ORDER.map((priority) => (
          <div key={priority} className="pipeline-col">
            {grouped[priority].map((item) => (
              <div
                key={item.id}
                className={`opp-card opp-card-${COL_INFO[priority].className}`}
              >
                <div className="opp-card-header">
                  <div className="opp-company">{item.company}</div>
                  <div className="opp-amount">{item.amount}</div>
                </div>

                <div className="opp-trigger">
                  <span className="opp-trigger-chip">
                    <i className="fas fa-bolt"></i> {item.trigger}
                  </span>
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
    </div>
  );
}