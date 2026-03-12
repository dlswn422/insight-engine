"use client";

import { useEffect, useMemo, useState } from "react";

type OpportunitySummary = {
  urgentCount: number;
  highCount: number;
  mediumCount: number;
  estimatedRevenue: number;
};

type OpportunityItem = {
  id: string;
  priority: "urgent" | "high" | "medium";
  company: string;
  trigger: string;
  desc: string;
  amount: string;
  amountValue: number;
  source: string;
  date: string;
  product: string;
  action: string;
};

type OpportunityResponse = {
  summary: OpportunitySummary;
  items: OpportunityItem[];
};

const EMPTY_DATA: OpportunityResponse = {
  summary: {
    urgentCount: 0,
    highCount: 0,
    mediumCount: 0,
    estimatedRevenue: 0,
  },
  items: [],
};

function groupByPriority(items: OpportunityItem[]) {
  return {
    urgent: items.filter((item) => item.priority === "urgent"),
    high: items.filter((item) => item.priority === "high"),
    medium: items.filter((item) => item.priority === "medium"),
  };
}

export default function OpportunitySection() {
  const [data, setData] = useState<OpportunityResponse>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOpportunity = async () => {
      try {
        const res = await fetch("/api/opportunities");
        const json = await res.json();

        if (!res.ok) {
          console.error("Opportunity API error:", json);
          setData(EMPTY_DATA);
          return;
        }

        setData({
          summary: {
            urgentCount: json?.summary?.urgentCount ?? 0,
            highCount: json?.summary?.highCount ?? 0,
            mediumCount: json?.summary?.mediumCount ?? 0,
            estimatedRevenue: json?.summary?.estimatedRevenue ?? 0,
          },
          items: Array.isArray(json?.items) ? json.items : [],
        });
      } catch (e) {
        console.error("Failed to fetch opportunities:", e);
        setData(EMPTY_DATA);
      } finally {
        setLoading(false);
      }
    };

    fetchOpportunity();
  }, []);

  const grouped = useMemo(() => groupByPriority(data.items), [data.items]);

  return (
    <section className="section active" id="section-opportunity">
      <div className="section-header">
        <h1>
          <i className="fas fa-rocket"></i> Opportunity Pipeline
        </h1>
        <p>AI 기반 신규 영업 기회 자동 발굴 현황</p>
      </div>

      {loading ? (
        <div className="chart-card" style={{ padding: "24px" }}>
          불러오는 중...
        </div>
      ) : (
        <>
          <div className="opp-kpi-row">
            <div className="opp-kpi">
              <div className="opp-kpi-icon urgent">
                <i className="fas fa-fire"></i>
              </div>
              <div className="opp-kpi-copy">
                <div className="opp-kpi-value">{data.summary.urgentCount}건</div>
                <div className="opp-kpi-label">긴급 (즉시 접촉)</div>
              </div>
            </div>

            <div className="opp-kpi">
              <div className="opp-kpi-icon high">
                <i className="fas fa-bolt"></i>
              </div>
              <div className="opp-kpi-copy">
                <div className="opp-kpi-value">{data.summary.highCount}건</div>
                <div className="opp-kpi-label">높음 (1주 내 접촉)</div>
              </div>
            </div>

            <div className="opp-kpi">
              <div className="opp-kpi-icon medium">
                <i className="fas fa-clock"></i>
              </div>
              <div className="opp-kpi-copy">
                <div className="opp-kpi-value">{data.summary.mediumCount}건</div>
                <div className="opp-kpi-label">보통 (추이 관찰)</div>
              </div>
            </div>

            <div className="opp-kpi">
              <div className="opp-kpi-icon revenue">
                <i className="fas fa-won-sign"></i>
              </div>
              <div className="opp-kpi-copy">
                <div className="opp-kpi-value">약 {data.summary.estimatedRevenue}억</div>
                <div className="opp-kpi-label">예상 연간 매출</div>
              </div>
            </div>
          </div>

          <div className="pipeline-stage-headers">
            <div className="ps-header ps-urgent">
              <span className="ps-dot urgent"></span>
              긴급 ({grouped.urgent.length})
            </div>
            <div className="ps-header ps-high">
              <span className="ps-dot high"></span>
              높음 ({grouped.high.length})
            </div>
            <div className="ps-header ps-medium">
              <span className="ps-dot medium"></span>
              보통 ({grouped.medium.length})
            </div>
          </div>

          <div className="pipeline-board">
            <div className="pipeline-col urgent">
              {grouped.urgent.map((item) => (
                <div key={item.id} className="opp-card urgent">
                  <div className="opp-card-header">
                    <div className="opp-company">{item.company}</div>
                    <div className="opp-amount">{item.amount}</div>
                  </div>

                  <div className="opp-trigger">{item.trigger}</div>
                  <div className="opp-desc">{item.desc}</div>

                  <div className="opp-footer">
                    <span className="opp-source">
                      <i className="fas fa-database"></i> {item.source}
                    </span>
                    <span className="opp-date">{item.date}</span>
                  </div>

                  <button type="button" className="opp-action-btn">
                    <i className="fas fa-paper-plane"></i> {item.action}
                  </button>
                </div>
              ))}
            </div>

            <div className="pipeline-col high">
              {grouped.high.map((item) => (
                <div key={item.id} className="opp-card high">
                  <div className="opp-card-header">
                    <div className="opp-company">{item.company}</div>
                    <div className="opp-amount">{item.amount}</div>
                  </div>

                  <div className="opp-trigger">{item.trigger}</div>
                  <div className="opp-desc">{item.desc}</div>

                  <div className="opp-footer">
                    <span className="opp-source">
                      <i className="fas fa-database"></i> {item.source}
                    </span>
                    <span className="opp-date">{item.date}</span>
                  </div>

                  <button type="button" className="opp-action-btn">
                    <i className="fas fa-paper-plane"></i> {item.action}
                  </button>
                </div>
              ))}
            </div>

            <div className="pipeline-col medium">
              {grouped.medium.map((item) => (
                <div key={item.id} className="opp-card medium">
                  <div className="opp-card-header">
                    <div className="opp-company">{item.company}</div>
                    <div className="opp-amount">{item.amount}</div>
                  </div>

                  <div className="opp-trigger">{item.trigger}</div>
                  <div className="opp-desc">{item.desc}</div>

                  <div className="opp-footer">
                    <span className="opp-source">
                      <i className="fas fa-database"></i> {item.source}
                    </span>
                    <span className="opp-date">{item.date}</span>
                  </div>

                  <button type="button" className="opp-action-btn">
                    <i className="fas fa-paper-plane"></i> {item.action}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}