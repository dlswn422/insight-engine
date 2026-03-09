export default function Sidebar() {
  return (
    <div className="sidebar" id="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <i className="fas fa-flask"></i>
        </div>

        <div className="logo-text">
          <span className="logo-main">신일팜글래스</span>
          <span className="logo-sub">B2B Intelligence</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <a className="nav-item active" data-section="overview">
          <i className="fas fa-th-large"></i>
          <span>Overview</span>
          <small>종합 상황판</small>
        </a>

        <a className="nav-item" data-section="reputation">
          <i className="fas fa-chart-bar"></i>
          <span>Reputation Monitor</span>
          <small>평판 분석</small>
        </a>

        <a className="nav-item" data-section="customer">
          <i className="fas fa-users"></i>
          <span>Customer Health</span>
          <small>고객 현황</small>
        </a>

        <a className="nav-item" data-section="opportunity">
          <i className="fas fa-rocket"></i>
          <span>Opportunity Pipeline</span>
          <small>영업 기회</small>
        </a>
      </nav>

      <div className="sidebar-footer">
        <div className="update-time">
          <i className="fas fa-sync-alt"></i>
          <span>최종 업데이트</span>
          <strong id="lastUpdate"></strong>
        </div>

        <div className="version-badge">Ver 1.0</div>
      </div>
    </div>
  );
}