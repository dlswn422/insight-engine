type SectionType = "overview" | "reputation" | "customer" | "opportunity";

interface SidebarProps {
  activeSection: SectionType;
  setActiveSection: (section: SectionType) => void;
}

export default function Sidebar({
  activeSection,
  setActiveSection,
}: SidebarProps) {
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
        <button
          type="button"
          className={`nav-item ${activeSection === "overview" ? "active" : ""}`}
          onClick={() => setActiveSection("overview")}
        >
          <i className="fas fa-th-large"></i>
          <span>Overview</span>
          <small>종합 상황판</small>
        </button>

        <button
          type="button"
          className={`nav-item ${activeSection === "reputation" ? "active" : ""}`}
          onClick={() => setActiveSection("reputation")}
        >
          <i className="fas fa-chart-bar"></i>
          <span>Reputation Monitor</span>
          <small>평판 분석</small>
        </button>

        <button
          type="button"
          className={`nav-item ${activeSection === "customer" ? "active" : ""}`}
          onClick={() => setActiveSection("customer")}
        >
          <i className="fas fa-users"></i>
          <span>Customer Health</span>
          <small>고객 현황</small>
        </button>

        <button
          type="button"
          className={`nav-item ${activeSection === "opportunity" ? "active" : ""}`}
          onClick={() => setActiveSection("opportunity")}
        >
          <i className="fas fa-rocket"></i>
          <span>Opportunity Pipeline</span>
          <small>영업 기회</small>
        </button>
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