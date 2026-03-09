import OpportunitySummary from "./OpportunitySummary";
import PipelineBoard from "./PipelineBoard";
import OpportunityChartsRow from "./OpportunityChartsRow";

export default function OpportunitySection() {
  return (
    <section className="section active" id="section-opportunity">
      <div className="section-header">
        <h1>
          <i className="fas fa-rocket"></i> Opportunity Pipeline
        </h1>
        <p>AI 기반 신규 영업 기회 자동 발굴 현황</p>
      </div>

      <OpportunitySummary />
      <PipelineBoard />
      <OpportunityChartsRow />
    </section>
  );
}