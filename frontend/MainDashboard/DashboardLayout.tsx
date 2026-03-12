import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { ReactNode } from "react";
import type { SectionType } from "./types";

interface Props {
  children: ReactNode;
  activeSection: SectionType;
  setActiveSection: (section: SectionType) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function DashboardLayout({
  children,
  activeSection,
  setActiveSection,
  sidebarOpen,
  setSidebarOpen,
}: Props) {
  return (
    <>
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        sidebarOpen={sidebarOpen}
      />

      <div className={`main-content ${sidebarOpen ? "" : "expanded"}`}>
        <Topbar
          activeSection={activeSection}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
        {children}
      </div>
    </>
  );
}