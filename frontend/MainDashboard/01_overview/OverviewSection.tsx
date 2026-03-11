import KpiCardsRow from "./KpiCardsRow";
import ChartsRow from "./ChartsRow";
import Alerts from "./Alerts";

export default function OverviewSection() {
  return (
    <section className="section active" id="section-overview">
      <div className="section-header">
        <h1>
          <i className="fas fa-th-large"></i> 전사 종합 상황판
        </h1>
        <p>신일팜글래스 B2B Intelligence 핵심 KPI 실시간 현황</p>
      </div>

      <KpiCardsRow />
      <ChartsRow />
      <Alerts />
    </section>
  );
}