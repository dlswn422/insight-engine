export default function Alerts() {
  return (
    <div className="alert-section">
      <div className="section-title-row">
        <h3>
          <i className="fas fa-bell"></i> 이번 주 핵심 알림
        </h3>
        <span className="badge-count">6건</span>
      </div>

      <div className="alert-list">
        <div className="alert-item alert-red">
          <div className="alert-icon">
            <i className="fas fa-exclamation-circle"></i>
          </div>
          <div className="alert-body">
            <div className="alert-title">한미약품 – 이탈 위험도 87% 감지</div>
            <div className="alert-desc">
              경쟁사 접촉 정황 + 발주량 -23% + 담당자 교체
            </div>
          </div>
          <div className="alert-time">2시간 전</div>
          <button className="alert-btn">상세보기</button>
        </div>

        <div className="alert-item alert-red">
          <div className="alert-icon">
            <i className="fas fa-exclamation-circle"></i>
          </div>
          <div className="alert-body">
            <div className="alert-title">동아ST – 이탈 위험도 79% 감지</div>
            <div className="alert-desc">
              입찰 불참 2회 + 품질 클레임 1건 접수
            </div>
          </div>
          <div className="alert-time">5시간 전</div>
          <button className="alert-btn">상세보기</button>
        </div>

        <div className="alert-item alert-yellow">
          <div className="alert-icon">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div className="alert-body">
            <div className="alert-title">보령제약 – 임상 3상 진입 확인</div>
            <div className="alert-desc">
              신규 바이알 수요 예측 +40% → 영업 접촉 권장
            </div>
          </div>
          <div className="alert-time">1일 전</div>
          <button className="alert-btn">기회 등록</button>
        </div>

        <div className="alert-item alert-green">
          <div className="alert-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="alert-body">
            <div className="alert-title">종근당 – 공장 착공 DART 공시</div>
            <div className="alert-desc">
              충북 오창 신규 공장 → 앰플 수요 1,200만 개/년 예상
            </div>
          </div>
          <div className="alert-time">2일 전</div>
          <button className="alert-btn">기회 등록</button>
        </div>

        <div className="alert-item alert-yellow">
          <div className="alert-icon">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div className="alert-body">
            <div className="alert-title">녹십자 – 평판 지수 하락 감지</div>
            <div className="alert-desc">
              최근 2주 미디어 부정 기사 +15건 급증
            </div>
          </div>
          <div className="alert-time">3일 전</div>
          <button className="alert-btn">분석보기</button>
        </div>

        <div className="alert-item alert-green">
          <div className="alert-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="alert-body">
            <div className="alert-title">코스맥스 – 화장품 앰플 신규 라인 증설</div>
            <div className="alert-desc">
              설비투자 공시 확인 → 즉시 접촉 필요
            </div>
          </div>
          <div className="alert-time">4일 전</div>
          <button className="alert-btn">기회 등록</button>
        </div>
      </div>
    </div>
  );
}