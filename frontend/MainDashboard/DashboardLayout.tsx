import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { ReactNode } from "react";

type SectionType =
  | "overview"
  | "reputation"
  | "customer"
  | "opportunity";

interface Props {
  children: ReactNode;
  activeSection: SectionType;
  setActiveSection: (section: SectionType) => void;
}

export default function DashboardLayout({
  children,
  activeSection,
  setActiveSection,
}: Props) {
  return (
    <>
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      />

      <div className="main-content" id="mainContent">
        <Topbar />
        {children}
      </div>
    </>
  );
}