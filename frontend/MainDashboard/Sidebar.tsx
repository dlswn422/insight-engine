import type { SectionType } from "./types";

interface Props {
  activeSection: SectionType;
  setActiveSection: (section: SectionType) => void;
  sidebarOpen: boolean;
}

const navItems: {
  key: SectionType;
  icon: string;
  title: string;
  subtitle: string;
  group: "analytics" | "management";
}[] = [
  {
    key: "overview",
    icon: "fa-table-cells-large",
    title: "Overview",
    subtitle: "종합 상황판",
    group: "analytics",
  },
  {
    key: "reputation",
    icon: "fa-chart-column",
    title: "Reputation",
    subtitle: "평판 분석",
    group: "analytics",
  },
  {
    key: "customer",
    icon: "fa-building-user",
    title: "Customer Health",
    subtitle: "고객 현황",
    group: "management",
  },
  {
    key: "opportunity",
    icon: "fa-magnifying-glass-chart",
    title: "Opportunities",
    subtitle: "영업 기회",
    group: "management",
  },
];

export default function Sidebar({
  activeSection,
  setActiveSection,
  sidebarOpen,
}: Props) {
  const analyticsItems = navItems.filter((item) => item.group === "analytics");
  const managementItems = navItems.filter((item) => item.group === "management");

  return (
    <aside className={`sidebar ${sidebarOpen ? "" : "collapsed"}`}>
      <div className="sidebar-header">
        <div className="logo-box">
          <i className="fas fa-flask"></i>
        </div>

        {sidebarOpen && (
          <div className="brand-copy">
            <strong>신일팜글래스</strong>
            <span>B2B Intelligence</span>
          </div>
        )}
      </div>

      {sidebarOpen && <div className="sidebar-section-label">ANALYTICS</div>}
      <nav className="nav-list">
        {analyticsItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`nav-item ${activeSection === item.key ? "active" : ""}`}
            onClick={() => setActiveSection(item.key)}
            title={!sidebarOpen ? item.title : ""}
          >
            <span className="nav-icon-box">
              <i className={`fas ${item.icon}`}></i>
            </span>

            {sidebarOpen && (
              <span className="nav-text">
                <span className="nav-title">{item.title}</span>
                <span className="nav-subtitle">{item.subtitle}</span>
              </span>
            )}
          </button>
        ))}
      </nav>

      {sidebarOpen && <div className="sidebar-section-label">MANAGEMENT</div>}
      <nav className="nav-list">
        {managementItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`nav-item ${activeSection === item.key ? "active" : ""}`}
            onClick={() => setActiveSection(item.key)}
            title={!sidebarOpen ? item.title : ""}
          >
            <span className="nav-icon-box">
              <i className={`fas ${item.icon}`}></i>
            </span>

            {sidebarOpen && (
              <span className="nav-text">
                <span className="nav-title">{item.title}</span>
                <span className="nav-subtitle">{item.subtitle}</span>
              </span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
}