import FilterBar from "./FilterBar";
import CustomerTable from "./CustomerTable";
import RiskChartsRow from "./RiskChartsRow";

export default function CustomerHealthSection() {
  return (
    <section className="section active" id="section-customer">
      <div className="section-header">
        <h1>
          <i className="fas fa-users"></i> Customer Health Dashboard
        </h1>
        <p>주요 고객사 건강도 실시간 모니터링</p>
      </div>

      <FilterBar />
      <CustomerTable />
      <RiskChartsRow />
    </section>
  );
}