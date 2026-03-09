import ScoreRow from "./ScoreRow";
import TrendAndMediaRow from "./Trend&Media";
import WordCloudPanel from "./WordCloudPanel";
import IssueTopList from "./IssueTopList";
import FinanceHealthPanel from "./FinanceHealth";

export default function ReputationSection() {
  return (
    <section className="section active" id="section-reputation">
      <div className="section-header">
        <h1>
          <i className="fas fa-chart-bar"></i> Reputation Monitor
        </h1>
        <p>신일팜글래스 미디어·재무·내부 평판 종합 분석</p>
      </div>

      <ScoreRow />

      <TrendAndMediaRow />

      <div className="charts-row">
        <WordCloudPanel />
        <IssueTopList />
      </div>

      <FinanceHealthPanel />
    </section>
  );
}