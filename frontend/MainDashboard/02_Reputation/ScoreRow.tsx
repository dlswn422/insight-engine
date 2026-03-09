export default function ScoreRow() {
  return (
    <div className="rep-score-row">
      <div className="rep-score-card">
        <div className="rep-score-label">미디어 평판</div>
        <div className="rep-score-gauge">
          <canvas id="gaugeMedia"></canvas>
        </div>
        <div className="rep-score-value" id="val-media">
          82<span>/100</span>
        </div>
        <div className="rep-score-trend positive">
          <i className="fas fa-arrow-up"></i> +4.1
        </div>
      </div>

      <div className="rep-score-card">
        <div className="rep-score-label">재무 건전성</div>
        <div className="rep-score-gauge">
          <canvas id="gaugeFinance"></canvas>
        </div>
        <div className="rep-score-value" id="val-finance">
          71<span>/100</span>
        </div>
        <div className="rep-score-trend warning">
          <i className="fas fa-minus"></i> 보통
        </div>
      </div>

      <div className="rep-score-card">
        <div className="rep-score-label">내부 평판</div>
        <div className="rep-score-gauge">
          <canvas id="gaugeInternal"></canvas>
        </div>
        <div className="rep-score-value" id="val-internal">
          84<span>/100</span>
        </div>
        <div className="rep-score-trend positive">
          <i className="fas fa-arrow-up"></i> +2.3
        </div>
      </div>

      <div className="rep-score-card highlight">
        <div className="rep-score-label">종합 평판 지수</div>
        <div className="rep-score-gauge">
          <canvas id="gaugeTotal"></canvas>
        </div>
        <div className="rep-score-value large" id="val-total">
          78<span>/100</span>
        </div>
        <div className="rep-score-trend positive">
          <i className="fas fa-arrow-up"></i> +3.2
        </div>
      </div>
    </div>
  );
}