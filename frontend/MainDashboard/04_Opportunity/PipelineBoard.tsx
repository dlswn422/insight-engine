export default function PipelineBoard() {
  return (
    <>
      <div className="pipeline-header">
        <div className="pipeline-stage-headers">
          <div className="ps-header ps-urgent">🔴 긴급 (4)</div>
          <div className="ps-header ps-high">🟡 높음 (5)</div>
          <div className="ps-header ps-medium">🔵 보통 (3)</div>
        </div>
      </div>

      <div className="pipeline-board" id="pipelineBoard"></div>
    </>
  );
}