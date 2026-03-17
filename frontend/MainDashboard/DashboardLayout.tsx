import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { ReactNode, useEffect, useState } from "react";
import type { SectionType } from "./types";

interface Props {
  children: ReactNode;
  activeSection: SectionType;
  setActiveSection: (section: SectionType) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const navItems: { key: SectionType; icon: string; label: string }[] = [
  { key: "overview", icon: "fa-table-cells-large", label: "홈" },
  { key: "reputation", icon: "fa-chart-column", label: "평판" },
  { key: "customer", icon: "fa-building-user", label: "고객" },
  { key: "opportunity", icon: "fa-magnifying-glass-chart", label: "기회" },
];

export default function DashboardLayout({
  children,
  activeSection,
  setActiveSection,
  sidebarOpen,
  setSidebarOpen,
}: Props) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div className={`app-container ${isMobile ? "is-mobile" : ""}`}>
      {!isMobile && (
        <Sidebar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          sidebarOpen={sidebarOpen}
        />
      )}

      <div className={`main-content ${!isMobile && !sidebarOpen ? "expanded" : ""} ${isMobile ? "mobile-main" : ""}`}>
        <Topbar
          activeSection={activeSection}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
        <main className="content-area">
          {children}
        </main>
      </div>

      {isMobile && (
        <nav className="bottom-nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`bottom-nav-item ${activeSection === item.key ? "active" : ""}`}
              onClick={() => setActiveSection(item.key)}
            >
              <i className={`fas ${item.icon}`}></i>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}